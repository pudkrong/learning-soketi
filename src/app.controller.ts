import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
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
