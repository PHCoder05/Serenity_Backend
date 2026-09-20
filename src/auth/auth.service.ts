import {
  BadRequestException,
  HttpStatus,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import axios from 'axios';
import { InjectRepository } from '@nestjs/typeorm';
import ms from 'ms';
import crypto from 'crypto';
import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { IsNull, MoreThan, Repository } from 'typeorm';
import { AuthEmailLoginDto } from './dto/auth-email-login.dto';
import { AuthUpdateDto } from './dto/auth-update.dto';
import { AuthProvidersEnum } from './auth-providers.enum';
import { SocialInterface } from '../social/interfaces/social.interface';
import { AuthRegisterLoginDto } from './dto/auth-register-login.dto';
import { NullableType } from '../utils/types/nullable.type';
import { LoginResponseDto } from './dto/login-response.dto';
import { ConfigService } from '@nestjs/config';
import { JwtRefreshPayloadType } from './strategies/types/jwt-refresh-payload.type';
import { JwtPayloadType } from './strategies/types/jwt-payload.type';
import { UsersService } from '../users/users.service';
import { AllConfigType } from '../config/config.type';
import { MailService } from '../mail/mail.service';
import { RoleEnum } from '../roles/roles.enum';
import { Session } from '../session/domain/session';
import { SessionService } from '../session/session.service';
import { StatusEnum } from '../statuses/statuses.enum';
import { User } from '../users/domain/user';
import { PhoneOtpEntity } from './infrastructure/persistence/relational/entities/phone-otp.entity';
import { isValidPhone, normalizePhone } from './utils/phone.util';

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_RATE_WINDOW_MS = 15 * 60 * 1000;
const OTP_RATE_MAX = 5;
const OTP_MAX_ATTEMPTS = 5;

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly sessionService: SessionService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService<AllConfigType>,
    @InjectRepository(PhoneOtpEntity)
    private readonly phoneOtpRepository: Repository<PhoneOtpEntity>,
  ) {}

  async requestPhoneOtp(phoneRaw: string) {
    const phone = normalizePhone(phoneRaw);
    if (!isValidPhone(phone)) {
      throw new BadRequestException({
        message: 'Invalid phone number',
        code: 'OTP_INVALID',
      });
    }

    const since = new Date(Date.now() - OTP_RATE_WINDOW_MS);
    const recent = await this.phoneOtpRepository.count({
      where: { phone, createdAt: MoreThan(since) },
    });
    if (recent >= OTP_RATE_MAX) {
      throw new BadRequestException({
        message: 'Too many OTP requests; try again later',
        code: 'OTP_RATE_LIMITED',
      });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = await bcrypt.hash(code, 10);
    await this.phoneOtpRepository.save(
      this.phoneOtpRepository.create({
        phone,
        codeHash,
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
        attempts: 0,
        consumedAt: null,
      }),
    );

    const provider = process.env.AUTH_OTP_PROVIDER || 'console';
    if (provider === 'console') {
      console.info(`[phone-otp] phone=${phone} code=${code}`);
    }

    const payload: {
      ok: true;
      expiresInSec: number;
      devCode?: string;
    } = {
      ok: true,
      expiresInSec: Math.floor(OTP_TTL_MS / 1000),
    };
    if (provider === 'console' && process.env.NODE_ENV !== 'production') {
      payload.devCode = code;
    }
    return payload;
  }

  async verifyPhoneOtp(
    phoneRaw: string,
    code: string,
  ): Promise<LoginResponseDto> {
    const phone = normalizePhone(phoneRaw);
    if (!isValidPhone(phone)) {
      throw new BadRequestException({
        message: 'Invalid phone number',
        code: 'OTP_INVALID',
      });
    }

    const row = await this.phoneOtpRepository.findOne({
      where: { phone, consumedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });

    if (!row) {
      throw new BadRequestException({
        message: 'No active OTP for this phone',
        code: 'OTP_INVALID',
      });
    }
    if (row.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException({
        message: 'OTP expired',
        code: 'OTP_EXPIRED',
      });
    }
    if (row.attempts >= OTP_MAX_ATTEMPTS) {
      throw new BadRequestException({
        message: 'OTP attempts exceeded',
        code: 'OTP_INVALID',
      });
    }

    const matches = await bcrypt.compare(code.trim(), row.codeHash);
    row.attempts += 1;
    if (!matches) {
      await this.phoneOtpRepository.save(row);
      throw new BadRequestException({
        message: 'Incorrect OTP',
        code: 'OTP_INVALID',
      });
    }

    row.consumedAt = new Date();
    await this.phoneOtpRepository.save(row);

    const user = await this.ensurePhoneUser(phone);
    return this.issueSession(user);
  }

  async loginWithFirebaseIdToken(idToken: string): Promise<LoginResponseDto> {
    const account = await this.lookupFirebasePhone(idToken);
    return this.issueSession(
      await this.ensurePhoneUser(account.phone, account.name),
    );
  }

  async lookupFirebasePhone(
    idToken: string,
  ): Promise<{ phone: string; name?: string }> {
    const apiKey = process.env.FIREBASE_WEB_API_KEY?.trim();
    if (!apiKey) {
      throw new ServiceUnavailableException({
        message: 'Firebase phone login is not configured on the API',
        code: 'FIREBASE_NOT_CONFIGURED',
      });
    }

    let response: {
      data?: {
        users?: Array<{
          phoneNumber?: string;
          displayName?: string;
        }>;
        error?: { message?: string };
      };
      status: number;
    };
    try {
      response = await axios.post(
        `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
        { idToken },
        { timeout: 10_000, validateStatus: () => true },
      );
    } catch {
      throw new ServiceUnavailableException({
        message: 'Could not reach Firebase to verify the ID token',
        code: 'FIREBASE_UNAVAILABLE',
      });
    }

    const phone = response.data?.users?.[0]?.phoneNumber;
    if (response.status >= 400 || !phone) {
      throw new BadRequestException({
        message:
          response.data?.error?.message ||
          'Firebase token is invalid or has no phone number',
        code: 'OTP_INVALID',
      });
    }

    return {
      phone,
      name: response.data?.users?.[0]?.displayName,
    };
  }

  async ensurePhoneUser(phoneRaw: string, name?: string): Promise<User> {
    const phone = normalizePhone(phoneRaw);
    let user = await this.usersService.findBySocialIdAndProvider({
      socialId: phone,
      provider: AuthProvidersEnum.phone,
    });

    if (user) {
      if (name && !user.firstName) {
        await this.usersService.update(user.id, { firstName: name });
        user = await this.usersService.findById(user.id);
      }
      if (!user) {
        throw new NotFoundException('User not found');
      }
      return user;
    }

    const created = await this.usersService.create({
      email: null,
      firstName: name?.trim() || null,
      lastName: null,
      socialId: phone,
      provider: AuthProvidersEnum.phone,
      role: { id: RoleEnum.user },
      status: { id: StatusEnum.active },
    });

    const loaded = await this.usersService.findById(created.id);
    if (!loaded) {
      throw new NotFoundException('User not found');
    }
    return loaded;
  }

  private async issueSession(user: User): Promise<LoginResponseDto> {
    const hash = crypto
      .createHash('sha256')
      .update(randomStringGenerator())
      .digest('hex');

    const session = await this.sessionService.create({
      user,
      hash,
    });

    const { token, refreshToken, tokenExpires } = await this.getTokensData({
      id: user.id,
      role: user.role,
      sessionId: session.id,
      hash,
    });

    return {
      refreshToken,
      token,
      tokenExpires,
      user,
    };
  }

  async validateLogin(loginDto: AuthEmailLoginDto): Promise<LoginResponseDto> {
    const user = await this.usersService.findByEmail(loginDto.email);

    if (!user) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          email: 'notFound',
        },
      });
    }

    if (user.provider !== AuthProvidersEnum.email) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          email: `needLoginViaProvider:${user.provider}`,
        },
      });
    }

    if (!user.password) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          password: 'incorrectPassword',
        },
      });
    }

    const isValidPassword = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isValidPassword) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          password: 'incorrectPassword',
        },
      });
    }

    const hash = crypto
      .createHash('sha256')
      .update(randomStringGenerator())
      .digest('hex');

    const session = await this.sessionService.create({
      user,
      hash,
    });

    const { token, refreshToken, tokenExpires } = await this.getTokensData({
      id: user.id,
      role: user.role,
      sessionId: session.id,
      hash,
    });

    return {
      refreshToken,
      token,
      tokenExpires,
      user,
    };
  }

  async validateSocialLogin(
    authProvider: string,
    socialData: SocialInterface,
  ): Promise<LoginResponseDto> {
    let user: NullableType<User> = null;
    const socialEmail = socialData.email?.toLowerCase();
    let userByEmail: NullableType<User> = null;

    if (socialEmail) {
      userByEmail = await this.usersService.findByEmail(socialEmail);
    }

    if (socialData.id) {
      user = await this.usersService.findBySocialIdAndProvider({
        socialId: socialData.id,
        provider: authProvider,
      });
    }

    if (user) {
      if (socialEmail && !userByEmail) {
        user.email = socialEmail;
      }
      await this.usersService.update(user.id, user);
    } else if (userByEmail) {
      user = userByEmail;
    } else if (socialData.id) {
      const role = {
        id: RoleEnum.user,
      };
      const status = {
        id: StatusEnum.active,
      };

      user = await this.usersService.create({
        email: socialEmail ?? null,
        firstName: socialData.firstName ?? null,
        lastName: socialData.lastName ?? null,
        socialId: socialData.id,
        provider: authProvider,
        role,
        status,
      });

      user = await this.usersService.findById(user.id);
    }

    if (!user) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          user: 'userNotFound',
        },
      });
    }

    const hash = crypto
      .createHash('sha256')
      .update(randomStringGenerator())
      .digest('hex');

    const session = await this.sessionService.create({
      user,
      hash,
    });

    const {
      token: jwtToken,
      refreshToken,
      tokenExpires,
    } = await this.getTokensData({
      id: user.id,
      role: user.role,
      sessionId: session.id,
      hash,
    });

    return {
      refreshToken,
      token: jwtToken,
      tokenExpires,
      user,
    };
  }

  async register(dto: AuthRegisterLoginDto): Promise<void> {
    const user = await this.usersService.create({
      ...dto,
      email: dto.email,
      role: {
        id: RoleEnum.user,
      },
      status: {
        id: StatusEnum.inactive,
      },
    });

    const hash = await this.jwtService.signAsync(
      {
        confirmEmailUserId: user.id,
      },
      {
        secret: this.configService.getOrThrow('auth.confirmEmailSecret', {
          infer: true,
        }),
        expiresIn: this.configService.getOrThrow('auth.confirmEmailExpires', {
          infer: true,
        }),
      },
    );

    await this.mailService.userSignUp({
      to: dto.email,
      data: {
        hash,
      },
    });
  }

  async confirmEmail(hash: string): Promise<void> {
    let userId: User['id'];

    try {
      const jwtData = await this.jwtService.verifyAsync<{
        confirmEmailUserId: User['id'];
      }>(hash, {
        secret: this.configService.getOrThrow('auth.confirmEmailSecret', {
          infer: true,
        }),
      });

      userId = jwtData.confirmEmailUserId;
    } catch {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          hash: `invalidHash`,
        },
      });
    }

    const user = await this.usersService.findById(userId);

    if (
      !user ||
      user?.status?.id?.toString() !== StatusEnum.inactive.toString()
    ) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        error: `notFound`,
      });
    }

    user.status = {
      id: StatusEnum.active,
    };

    await this.usersService.update(user.id, user);
  }

  async confirmNewEmail(hash: string): Promise<void> {
    let userId: User['id'];
    let newEmail: User['email'];

    try {
      const jwtData = await this.jwtService.verifyAsync<{
        confirmEmailUserId: User['id'];
        newEmail: User['email'];
      }>(hash, {
        secret: this.configService.getOrThrow('auth.confirmEmailSecret', {
          infer: true,
        }),
      });

      userId = jwtData.confirmEmailUserId;
      newEmail = jwtData.newEmail;
    } catch {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          hash: `invalidHash`,
        },
      });
    }

    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        error: `notFound`,
      });
    }

    user.email = newEmail;
    user.status = {
      id: StatusEnum.active,
    };

    await this.usersService.update(user.id, user);
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          email: 'emailNotExists',
        },
      });
    }

    const tokenExpiresIn = this.configService.getOrThrow('auth.forgotExpires', {
      infer: true,
    });

    const tokenExpires = Date.now() + ms(tokenExpiresIn);

    const hash = await this.jwtService.signAsync(
      {
        forgotUserId: user.id,
      },
      {
        secret: this.configService.getOrThrow('auth.forgotSecret', {
          infer: true,
        }),
        expiresIn: tokenExpiresIn,
      },
    );

    await this.mailService.forgotPassword({
      to: email,
      data: {
        hash,
        tokenExpires,
      },
    });
  }

  async resetPassword(hash: string, password: string): Promise<void> {
    let userId: User['id'];

    try {
      const jwtData = await this.jwtService.verifyAsync<{
        forgotUserId: User['id'];
      }>(hash, {
        secret: this.configService.getOrThrow('auth.forgotSecret', {
          infer: true,
        }),
      });

      userId = jwtData.forgotUserId;
    } catch {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          hash: `invalidHash`,
        },
      });
    }

    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          hash: `notFound`,
        },
      });
    }

    user.password = password;

    await this.sessionService.deleteByUserId({
      userId: user.id,
    });

    await this.usersService.update(user.id, user);
  }

  async me(userJwtPayload: JwtPayloadType): Promise<NullableType<User>> {
    return this.usersService.findById(userJwtPayload.id);
  }

  async update(
    userJwtPayload: JwtPayloadType,
    userDto: AuthUpdateDto,
  ): Promise<NullableType<User>> {
    const currentUser = await this.usersService.findById(userJwtPayload.id);

    if (!currentUser) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          user: 'userNotFound',
        },
      });
    }

    if (userDto.password) {
      if (!userDto.oldPassword) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            oldPassword: 'missingOldPassword',
          },
        });
      }

      if (!currentUser.password) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            oldPassword: 'incorrectOldPassword',
          },
        });
      }

      const isValidOldPassword = await bcrypt.compare(
        userDto.oldPassword,
        currentUser.password,
      );

      if (!isValidOldPassword) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            oldPassword: 'incorrectOldPassword',
          },
        });
      } else {
        await this.sessionService.deleteByUserIdWithExclude({
          userId: currentUser.id,
          excludeSessionId: userJwtPayload.sessionId,
        });
      }
    }

    if (userDto.email && userDto.email !== currentUser.email) {
      const userByEmail = await this.usersService.findByEmail(userDto.email);

      if (userByEmail && userByEmail.id !== currentUser.id) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            email: 'emailExists',
          },
        });
      }

      const hash = await this.jwtService.signAsync(
        {
          confirmEmailUserId: currentUser.id,
          newEmail: userDto.email,
        },
        {
          secret: this.configService.getOrThrow('auth.confirmEmailSecret', {
            infer: true,
          }),
          expiresIn: this.configService.getOrThrow('auth.confirmEmailExpires', {
            infer: true,
          }),
        },
      );

      await this.mailService.confirmNewEmail({
        to: userDto.email,
        data: {
          hash,
        },
      });
    }

    delete userDto.email;
    delete userDto.oldPassword;

    await this.usersService.update(userJwtPayload.id, userDto);

    return this.usersService.findById(userJwtPayload.id);
  }

  async refreshToken(
    data: Pick<JwtRefreshPayloadType, 'sessionId' | 'hash'>,
  ): Promise<Omit<LoginResponseDto, 'user'>> {
    const hash = crypto
      .createHash('sha256')
      .update(randomStringGenerator())
      .digest('hex');

    const session = await this.sessionService.updateByHash(
      { id: data.sessionId, hash: data.hash },
      { hash },
    );

    if (!session) {
      throw new UnauthorizedException();
    }

    const user = await this.usersService.findById(session.user.id);

    if (!user?.role) {
      throw new UnauthorizedException();
    }

    const { token, refreshToken, tokenExpires } = await this.getTokensData({
      id: session.user.id,
      role: {
        id: user.role.id,
      },
      sessionId: session.id,
      hash,
    });

    return {
      token,
      refreshToken,
      tokenExpires,
    };
  }

  async softDelete(user: User): Promise<void> {
    await this.usersService.remove(user.id);
  }

  async logout(data: Pick<JwtRefreshPayloadType, 'sessionId'>) {
    return this.sessionService.deleteById(data.sessionId);
  }

  private async getTokensData(data: {
    id: User['id'];
    role: User['role'];
    sessionId: Session['id'];
    hash: Session['hash'];
  }) {
    const tokenExpiresIn = this.configService.getOrThrow('auth.expires', {
      infer: true,
    });

    const tokenExpires = Date.now() + ms(tokenExpiresIn);

    const [token, refreshToken] = await Promise.all([
      await this.jwtService.signAsync(
        {
          id: data.id,
          role: data.role,
          sessionId: data.sessionId,
        },
        {
          secret: this.configService.getOrThrow('auth.secret', { infer: true }),
          expiresIn: tokenExpiresIn,
        },
      ),
      await this.jwtService.signAsync(
        {
          sessionId: data.sessionId,
          hash: data.hash,
        },
        {
          secret: this.configService.getOrThrow('auth.refreshSecret', {
            infer: true,
          }),
          expiresIn: this.configService.getOrThrow('auth.refreshExpires', {
            infer: true,
          }),
        },
      ),
    ]);

    return {
      token,
      refreshToken,
      tokenExpires,
    };
  }
}
