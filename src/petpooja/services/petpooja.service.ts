import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AllConfigType } from '../../config/config.type';
import { firstValueFrom } from 'rxjs';
import { SaveOrderDto } from '../dto/save-order.dto';
import { FetchMenuDto } from '../dto/fetch-menu.dto';
import { UpdateOrderStatusDto } from '../dto/update-order-status.dto';
import { UpdateRiderStatusDto } from '../dto/rider-status.dto';
import { PetpoojaWebhookService } from './petpooja-webhook.service';

@Injectable()
export class PetpoojaService {
  private readonly logger = new Logger(PetpoojaService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService<AllConfigType>,
    private readonly webhookService: PetpoojaWebhookService,
  ) {}

  private getAuthHeaders() {
    return {
      'app-key': this.configService.get('petpooja.appKey', { infer: true }),
      'app-secret': this.configService.get('petpooja.appSecret', {
        infer: true,
      }),
      'access-token': this.configService.get('petpooja.accessToken', {
        infer: true,
      }),
    };
  }

  async saveOrder(payload: SaveOrderDto) {
    await this.webhookService.persistOutboundOrder(payload, 'pending');

    const url = this.configService.get('petpooja.saveOrderUrl', {
      infer: true,
    });
    try {
      const response = await firstValueFrom(
        this.httpService.post(url as string, payload, {
          headers: {
            ...this.getAuthHeaders(),
            'Content-Type': 'application/json',
          },
        }),
      );

      await this.webhookService.persistOutboundOrder(payload, 'submitted');

      return response.data;
    } catch (error: any) {
      this.logger.error(`Error in saveOrder: ${error.message}`, error.stack);
      throw error;
    }
  }

  async fetchMenu(payload: FetchMenuDto) {
    const url = this.configService.get('petpooja.fetchMenuUrl', {
      infer: true,
    });
    try {
      const requestPayload = {
        app_key: this.configService.get('petpooja.appKey', { infer: true }),
        app_secret: this.configService.get('petpooja.appSecret', {
          infer: true,
        }),
        access_token: this.configService.get('petpooja.accessToken', {
          infer: true,
        }),
        restID: payload.restID,
      };
      const response = await firstValueFrom(
        this.httpService.post(url as string, requestPayload, {
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      await this.webhookService.persistFetchedMenu(
        payload.restID,
        response.data as Record<string, unknown>,
      );

      return response.data;
    } catch (error: any) {
      this.logger.error(`Error in fetchMenu: ${error.message}`, error.stack);
      throw error;
    }
  }

  async updateOrderStatus(payload: UpdateOrderStatusDto) {
    const url = this.configService.get('petpooja.updateOrderStatusUrl', {
      infer: true,
    });
    try {
      const finalPayload = {
        app_key: this.configService.get('petpooja.appKey', { infer: true }),
        app_secret: this.configService.get('petpooja.appSecret', {
          infer: true,
        }),
        access_token: this.configService.get('petpooja.accessToken', {
          infer: true,
        }),
        ...payload,
      };
      const response = await firstValueFrom(
        this.httpService.post(url as string, finalPayload, {
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      await this.webhookService.orderCallback({
        restID: payload.restID,
        orderID: payload.orderID,
        status: String(payload.status),
        cancel_reason: payload.cancelReason,
      });

      return response.data;
    } catch (error: any) {
      this.logger.error(
        `Error in updateOrderStatus: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async updateRiderStatus(payload: UpdateRiderStatusDto) {
    const url = this.configService.get('petpooja.riderStatusUrl', {
      infer: true,
    });
    try {
      const finalPayload = {
        app_key: this.configService.get('petpooja.appKey', { infer: true }),
        app_secret: this.configService.get('petpooja.appSecret', {
          infer: true,
        }),
        access_token: this.configService.get('petpooja.accessToken', {
          infer: true,
        }),
        ...payload,
      };
      const response = await firstValueFrom(
        this.httpService.post(url as string, finalPayload, {
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      await this.webhookService.orderCallback({
        restID: payload.outlet_id,
        orderID: String(payload.order_id),
        status: String(payload.status),
        rider_name: payload.rider_data?.rider_name,
        rider_phone_number: payload.rider_data?.rider_phone_number,
      });

      return response.data;
    } catch (error: any) {
      this.logger.error(
        `Error in updateRiderStatus: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
