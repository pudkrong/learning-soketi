import { Injectable, Logger } from '@nestjs/common';
import * as Pusher from 'pusher';
import { UserAuthResponse, Response } from 'pusher';
import { randomBytes } from 'node:crypto';

@Injectable()
export class AppService {
  private pusher: Pusher;
  private userMap = new Map<string, Record<string, unknown>>();

  constructor() {
    this.pusher = new Pusher({
      host: 'localhost',
      port: '6001',
      appId: 'app-id',
      key: 'app-key',
      secret: 'app-secret',
      cluster: '',
      useTLS: false,
    });

    // setInterval(async () => {
    //   try {
    //     await this.pusher.trigger(
    //       'private-message',
    //       'data',
    //       Math.random() * 1000,
    //     );
    //   } catch (ex) {
    //     Logger.error(`Trigger error: `, ex);
    //   }
    // }, 1000);
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

  authenticate(user: string, socketId: string): UserAuthResponse {
    if (user === 'xxx') throw new Error('user is banned');

    const userInfo = {
      id: `${user}_${randomBytes(5).toString('hex')}`,
      user_info: {
        name: `Fullname of ${user}`,
      },
      watchlist: [],
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

    return this.pusher.authorizeChannel(socketId, channel);
  }
}
