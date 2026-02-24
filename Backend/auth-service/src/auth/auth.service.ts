import { PrismaService } from "src/database/prisma.service";
import { JwtService } from "@nestjs/jwt"
import { Injectable, ConflictException } from "@nestjs/common";
import { RegisterDto } from "./dto/register.dto";
import * as bcrypt from "bcrypt"
import { Prisma } from "generated/prisma/client";
import { RedisService } from "src/redis.service";

@Injectable()
export class AuthService
{
    constructor(private readonly conn: PrismaService,
        private readonly jwt: JwtService,
        private readonly redis: RedisService)
    {
    }

    async register(data: RegisterDto)
    {
        const { email, username, password } = data;
        const encryptPass = await bcrypt.hash(password, 10);

        try
        {
            const result = await this.conn.$transaction(async (tx) => {
                const user = await this.conn.user.create({
                    data: {
                        email,
                        username,
                        hashedPassword: encryptPass,
                        authProvider: 'LOCAL'
                    },
                });

                const accessToken = this.jwt.sign({
                    sub: user.id,
                    email: user.email
                });

                const session = await this.conn.session.create({
                    data : {
                        userId : user.id,
                        token : accessToken,
                        expiresAt: new Date(Date.now() + (Number(process.env.JWT_EXPIRATION) || 3600) * 1000)
                    },
                });

                return ({ user, accessToken, session });
            });

            return ({
                success: true,
                data: {
                    id: result.user.id,
                    user:{
                        email: result.user.email,
                        username: result.user.username
                    },
                    accessToken: result.accessToken,
                },
            });
        } catch (error)
        {
            if (error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === 'P2002')
            {
                throw new ConflictException('Email or username already exists');
            }
            throw error; 
        }
    }
}