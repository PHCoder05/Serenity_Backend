import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import axios from 'axios';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import ms from 'ms';
import crypto from 'crypto';
import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { DataSource, IsNull, MoreThan, Repository } from 'typeorm';
import { AuthEmailLoginDto } from './dto/auth-email-login.dto';
import { AuthUpdateDto } from './dto/auth-update.dto';
import { AuthProvidersEnum } from './auth-providers.enum';
import { SocialInterface } from '../social/interfaces/social.interface';
import { AuthRegisterLoginDto } from './dto/auth-register-login.dto';
import { AuthRegisterDto } from './dto/auth-register.dto';
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
import { AuthRateLimitEntity } from './infrastructure/persistence/relational/entities/auth-rate-limit.entity';
import { SerenityOrderEntity } from '../serenity/infrastructure/persistence/relational/entities/serenity-order.entity';
import { UserProfileEntity } from '../serenity/infrastructure/persistence/relational/entities/user-profile.entity';
import { isValidPhone, maskPhone, normalizePhone } from './utils/phone.util';

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_RATE_WINDOW_MS = 15 * 60 * 1000;
const OTP_RATE_MAX = 5;
const OTP_MAX_ATTEMPTS = 5;
const EMAIL_AUTH_WINDOW_MS = 15 * 60 * 1000;
const EMAIL_AUTH_MAX = 40;
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('timing-pad', 10);

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly sessionService: SessionService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService<AllConfigType>,
    @InjectRepository(PhoneOtpEntity)
    private readonly phoneOtpRepository: Repository<PhoneOtpEntity>,
    @Optional()
    @InjectRepository(SerenityOrderEntity)
    private readonly orderRepository?: Repository<SerenityOrderEntity>,
    @Optional()
    @InjectRepository(AuthRateLimitEntity)
    private readonly emailAuthRateRepository?: Repository<AuthRateLimitEntity>,
    @Optional()
    @InjectRepository(UserProfileEntity)
    private readonly profileRepository?: Repository<UserProfileEntity>,
    @Optional()
    @InjectDataSource()
    private readonly dataSource?: DataSource,
  ) {}

  private readonly emailAuthHits = new Map<string, number[]>();
  private readonly emailAuthTail = new Map<string, Promise<void>>();

  private async assertEmailAuthRate(action: string, email: string) {
    const key = `${action}:${email.trim().toLowerCase()}`;
    if (this.emailAuthRateRepository) {
      const repository = this.emailAuthRateRepository;
      const record = async (repo: Repository<AuthRateLimitEntity>) => {
        const since = new Date(Date.now() - EMAIL_AUTH_WINDOW_MS);
        const hits = await repo.count({
          where: { key, hitAt: MoreThan(since) },
        });
        if (hits >= EMAIL_AUTH_MAX) {
          throw new HttpException(
            {
              message: 'Too many attempts; try again later',
              code: 'AUTH_RATE_LIMITED',
            },
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }
        await repo.save(repo.create({ key, hitAt: new Date() }));
      };
      if (this.dataSource) {
        await this.dataSource.transaction(async (manager) => {
          await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
            `auth-rate:${key}`,
          ]);
          await record(manager.getRepository(AuthRateLimitEntity));
        });
      } else {
        await this.withEmailAuthLock(key, () => record(repository));
      }
      return;
    }

    await this.withEmailAuthLock(key, async () => {
      const now = Date.now();
      const hits = (this.emailAuthHits.get(key) ?? []).filter(
        (at) => now - at < EMAIL_AUTH_WINDOW_MS,
      );
      if (hits.length >= EMAIL_AUTH_MAX) {
        throw new HttpException(
          {
            message: 'Too many attempts; try again later',
            code: 'AUTH_RATE_LIMITED',
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      hits.push(now);
      this.emailAuthHits.set(key, hits);
    });
  }

  private async withEmailAuthLock<T>(
    key: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    const previous = this.emailAuthTail.get(key) ?? Promise.resolve();
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const tail = previous.then(() => gate);
    this.emailAuthTail.set(key, tail);
    await previous.catch(() => undefined);
    try {
      return await fn();
    } finally {
      release();
      if (this.emailAuthTail.get(key) === tail) {
        this.emailAuthTail.delete(key);
      }
    }
  }

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

    if (!this.phoneOtpCanBeDelivered()) {
      throw new BadRequestException({
        message:
          'Phone OTP is not configured. Use Firebase sign-in, or set AUTH_OTP_DEV_CODE=true on a lab API.',
        code: 'OTP_PROVIDER_UNAVAILABLE',
      });
    }

    const code = String(crypto.randomInt(100000, 1000000));
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

    this.logger.log(`Phone OTP issued for ${maskPhone(phone)}.`);

    const payload: {
      ok: true;
      expiresInSec: number;
      devCode?: string;
    } = {
      ok: true,
      expiresInSec: Math.floor(OTP_TTL_MS / 1000),
    };
    if (this.exposePhoneOtpDevCode()) {
      payload.devCode = code;
    }
    return payload;
  }

  private phoneOtpCanBeDelivered(): boolean {
    const provider = (process.env.AUTH_OTP_PROVIDER || 'console').toLowerCase();
    if (provider !== 'console') {
      return false;
    }
    if ((process.env.NODE_ENV || '').toLowerCase() === 'production') {
      return false;
    }
    return this.exposePhoneOtpDevCode();
  }

  private exposePhoneOtpDevCode(): boolean {
    if ((process.env.NODE_ENV || '').toLowerCase() === 'production') {
      return false;
    }
    return (
      process.env.NODE_ENV === 'test' ||
      process.env.AUTH_OTP_DEV_CODE === 'true'
    );
  }

  async verifyPhoneOtp(
    phoneRaw: string,
    code: string,
  ): Promise<LoginResponseDto> {
    const phone = await this.consumePhoneOtp(phoneRaw, code);
    const user = await this.ensurePhoneUser(phone);
    await this.claimGuestOrders(user.id as number, phone);
    return this.issueSession(user);
  }

  async registerWithPhone(dto: AuthRegisterDto): Promise<LoginResponseDto> {
    await this.assertEmailAuthRate('register', dto.email);
    const phone = await this.consumePhoneOtp(dto.phone, dto.otpCode);

    const existingPhone = await this.usersService.findBySocialIdAndProvider({
      socialId: phone,
      provider: AuthProvidersEnum.phone,
    });
    if (existingPhone) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          phone: 'phoneAlreadyExists',
        },
      });
    }

    const created = await this.usersService.create({
      email: dto.email,
      password: dto.password,
      firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(),
      socialId: phone,
      provider: AuthProvidersEnum.phone,
      role: { id: RoleEnum.user },
      status: { id: StatusEnum.active },
    });

    const user = await this.usersService.findById(created.id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.upsertProfilePhone(user.id as number, phone);
    await this.claimGuestOrders(user.id as number, phone);
    return this.issueSession(user);
  }

  private async consumePhoneOtp(
    phoneRaw: string,
    code: string,
  ): Promise<string> {
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
    return phone;
  }

  private async upsertProfilePhone(userId: number, phone: string) {
    if (!this.profileRepository || !Number.isFinite(userId)) {
      return;
    }
    let row = await this.profileRepository.findOne({ where: { userId } });
    if (!row) {
      row = this.profileRepository.create({
        userId,
        phone,
        dietPreferenceIds: [],
        pushEnabled: true,
        emailEnabled: false,
      });
    } else {
      row.phone = phone;
    }
    await this.profileRepository.save(row);
  }

  async loginWithFirebaseIdToken(idToken: string): Promise<LoginResponseDto> {
    const account = await this.lookupFirebasePhone(idToken);
    const user = await this.ensurePhoneUser(account.phone, account.name);
    await this.claimGuestOrders(
      user.id as number,
      normalizePhone(account.phone),
    );
    return this.issueSession(user);
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

  private async claimGuestOrders(userId: number, phone: string) {
    if (!this.orderRepository || !Number.isFinite(userId)) {
      return;
    }
    await this.orderRepository.update(
      {
        guestPhone: phone,
        isGuestCheckout: true,
        userId: IsNull(),
      },
      { userId },
    );
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
    await this.assertEmailAuthRate('login', loginDto.email);
    const user = await this.usersService.findByEmail(loginDto.email);

    const passwordHash = user?.password || DUMMY_PASSWORD_HASH;
    const isValidPassword = await bcrypt.compare(
      loginDto.password,
      passwordHash,
    );

    if (!user?.password || !isValidPassword || loginDto.password === 'secret') {
      this.invalidCredentials();
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

    const emailForNewAccount = socialEmail && !userByEmail ? socialEmail : null;

    if (user) {
      if (emailForNewAccount) {
        user.email = emailForNewAccount;
      }
      await this.usersService.update(user.id, user);
    } else if (socialData.id) {
      const role = {
        id: RoleEnum.user,
      };
      const status = {
        id: StatusEnum.active,
      };

      user = await this.usersService.create({
        email: emailForNewAccount,
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
    await this.assertEmailAuthRate('register', dto.email);
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
    await this.assertEmailAuthRate('forgot', email);
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      return;
    }

    const tokenExpiresIn = this.configService.getOrThrow('auth.forgotExpires', {
      infer: true,
    });

    const tokenExpires = Date.now() + ms(tokenExpiresIn);

    const hash = await this.jwtService.signAsync(
      {
        forgotUserId: user.id,
        pv: this.passwordFingerprint(user),
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
        pv?: string;
      }>(hash, {
        secret: this.configService.getOrThrow('auth.forgotSecret', {
          infer: true,
        }),
      });

      userId = jwtData.forgotUserId;
      const resetUser = await this.usersService.findById(userId);
      if (
        !resetUser ||
        !jwtData.pv ||
        jwtData.pv !== this.passwordFingerprint(resetUser)
      ) {
        throw new Error('stale reset token');
      }
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
    await this.sessionService.deleteByUserId({ userId: user.id });
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
          hash: data.hash,
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

  private invalidCredentials(): never {
    throw new UnprocessableEntityException({
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      errors: {
        password: 'incorrectPassword',
      },
    });
  }

  private passwordFingerprint(user: User): string {
    return crypto
      .createHash('sha256')
      .update(user.password ?? '')
      .digest('hex');
  }
}
