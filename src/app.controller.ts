import {
  Body,
  Controller,
  Get,
  Header,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
  Logger,
  Post,
  Req,
} from '@nestjs/common';
import { AppService } from './app.service';
import { ChannelAuthResponse, UserAuthResponse, Response } from 'pusher';

type WSAuthRequest = {
  user: string;
  socket_id: string;
};

type WSAuthChannelRequest = {
  socket_id: string;
  channel_name: string;
};

type EventRequest = {
  channel: string;
  event: string;
  data: unknown;
};

type WebhookRequest = {
  time_ms: number;
  events: { name: string; channel: string; [k: string]: string }[];
};

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('event')
  @HttpCode(200)
  async sendMessage(@Body() req: EventRequest): Promise<Response> {
    return this.appService.sendMessage(req.channel, req.event, req.data);
  }

  @Post('webhook')
  @HttpCode(201)
  async webhook(
    @Headers('x-pusher-key') appKey: string,
    @Headers('x-pusher-signature') signature: string,
    @Body() req: WebhookRequest,
  ): Promise<void> {
    try {
      console.log('DEBUG>>', req);
      if (!this.appService.validateWebhookSignature(req, signature)) return;

      await this.appService.handleWebhook(
        req.events[0].name,
        req.events[0].channel,
      );
    } catch (error) {
      console.log('webhook error', error);
      throw new HttpException(
        'Webhook error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('user-auth')
  @HttpCode(200)
  authenticateUser(@Body() wsAuthRequest: WSAuthRequest): UserAuthResponse {
    try {
      console.log('wsAuthRequest:', wsAuthRequest);
      const response = this.appService.authenticate(
        wsAuthRequest.user,
        wsAuthRequest.socket_id,
      );
      console.log('auth successful', response);
      return response;
    } catch (err) {
      console.log('auth error', err);
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }
  }

  @Post('auth')
  @HttpCode(200)
  authorizeUser(
    @Body() channelRequest: WSAuthChannelRequest,
  ): ChannelAuthResponse {
    try {
      console.log('channelRequest:', channelRequest);
      const response = this.appService.authorizeChannel(
        channelRequest.socket_id,
        channelRequest.channel_name,
      );
      console.log('authz successful', response);
      return response;
    } catch (err) {
      console.error('Authz error', err);
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }
  }
}
