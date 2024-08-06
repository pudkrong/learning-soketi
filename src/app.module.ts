import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ServeStaticModule } from '@nestjs/serve-static';
import { dirname, join } from 'path';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '../static'),
      exclude: ['/pusher/(.*)'],
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
