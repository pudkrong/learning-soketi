import { Injectable, Logger } from '@nestjs/common';
import * as Pusher from 'pusher';
import { UserAuthResponse, Response } from 'pusher';
import { createHmac } from 'node:crypto';
import { ConfigService } from '@nestjs/config';

type UserInfo = {
  id: string;
  user_info: {
    user: string;
    firstname: string;
    lastname: string;
    position: string;
  };
  watchlist?: string[];
};

@Injectable()
export class AppService {
  private pusher: Pusher;
  private userMap = new Map<string, UserInfo>();
  private timerMap = new Map<string, NodeJS.Timeout>();
  private appId: string;
  private appKey: string;
  private appSecret: string;

  constructor(private configService: ConfigService) {
    this.appId = this.configService.getOrThrow<string>('PUSHER_APP_ID', {
      infer: true,
    });
    this.appKey = this.configService.getOrThrow<string>('PUSHER_APP_KEY', {
      infer: true,
    });
    this.appSecret = this.configService.getOrThrow<string>(
      'PUSHER_APP_SECRET',
      { infer: true },
    );

    this.pusher = new Pusher({
      host: 'localhost',
      port: '6001',
      appId: this.appId,
      key: this.appKey,
      secret: this.appSecret,
      cluster: '',
      useTLS: false,
    });
  }

  getHello(): string {
    return 'Hello World!';
  }

  async sendMessage(
    channel: string,
    event: string,
    data: unknown,
  ): Promise<Response> {
    return this.pusher.trigger(channel, event, data);
  }

  private getFriends(user: string): string[] {
    const lowerUser = user.toLowerCase();
    const matches = /^(?<name>\D+)/.exec(lowerUser);
    const namePattern = matches?.groups?.name ?? '9';

    const friends: string[] = [];
    for (const item of this.userMap.values()) {
      const lowerKey = item.user_info.user.toLowerCase();
      if (lowerKey.startsWith(namePattern) && lowerKey !== lowerUser) {
        friends.push(item.id);
      }
    }

    // return friends;
    return ['pud', 'pud2', 'pud3'];
  }

  authenticate(user: string, socketId: string): UserAuthResponse {
    // Fail to authenticate any user who starts with 'x'
    if (user.startsWith('x')) throw new Error('user is banned');

    const friends = this.getFriends(user);
    const userInfo: UserInfo = {
      id: user,
      user_info: {
        user,
        firstname: 'Pisut',
        lastname: 'Sritrakulchai',
        position: 'Software engineer',
      },
      watchlist: friends.splice(0, 10),
    };
    const authResponse = this.pusher.authenticateUser(socketId, userInfo);
    this.userMap.set(socketId, userInfo);
    return authResponse;
  }

  authorizeChannel(
    socketId: string,
    channel: string,
  ): Pusher.ChannelAuthResponse {
    const user = this.userMap.get(socketId);
    if (user === undefined) throw new Error('User not found');

    const firstUserChar = user.user_info.user.charAt(0);
    const firstChannelChar = channel
      .replace(/^(?:private|presence)(?:-cache)?-unit-/, '')
      .charAt(0);
    if (firstUserChar !== firstChannelChar)
      throw new Error(
        `User ${user.user_info.user} is not authorized to subscribe unit: ${channel}`,
      );

    return /^private-/.test(channel)
      ? this.pusher.authorizeChannel(socketId, channel)
      : this.pusher.authorizeChannel(socketId, channel, {
          user_id: user.id,
          user_info: user.user_info,
        });
  }

  validateWebhookSignature(
    payload: Record<string, unknown>,
    signature: string,
  ): boolean {
    const expectedSignature = createHmac('sha256', this.appSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    return expectedSignature === signature;
  }

  async handleWebhook(
    event: string,
    channel: string,
    meta?: Record<string, unknown>,
  ): Promise<void> {
    if (!['channel_occupied', 'channel_vacated'].includes(event)) return;

    if (event === 'channel_occupied' && /^private-(?!cache-)/i.test(channel)) {
      Logger.debug(`Trigger real time data for channel: ${channel}`);
      const timer = setInterval(async () => {
        await this.sendMessage(channel, 'data', `${channel} => ${Date.now()}`);
      }, 1000);
      this.timerMap.set(channel, timer);
    } else {
      if (this.timerMap.has(channel)) {
        Logger.debug(`Stop real time update for channel: ${channel}`);
        clearInterval(this.timerMap.get(channel));
      }
    }
  }
}
