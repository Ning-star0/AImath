import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthAdminController } from './auth-admin.controller';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { resolveJwtSecret } from './jwt-secret';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: resolveJwtSecret(configService),
        signOptions: {
          expiresIn: configService.get<string>('jwtExpiresIn', '7d'),
        },
      }),
    }),
  ],
  controllers: [AuthController, AuthAdminController],
  providers: [AuthService, JwtStrategy, RolesGuard],
  exports: [AuthService],
})
export class AuthModule {}
