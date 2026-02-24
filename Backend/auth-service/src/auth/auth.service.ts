import { PrismaService } from "src/prisma.service";
import { JwtService } from "@nestjs/jwt"
import { Injectable } from "@nestjs/common";
import { RegisterDto } from "./dto/register.dto";
import * as bcrypt from "bcrypt"

@Injectable()
export class AuthService
{
    constructor(private readonly conn: PrismaService,
        private readonly jwt: JwtService)
    {
    }

    async register(data: RegisterDto)
    {
        const verifyByUsername = await this.conn.user.findUnique({where: {username : data.username}});
        const veifyByEmail = await this.conn.user.findUnique({where: {email: data.email}});

        if (veifyByEmail || verifyByUsername)
            throw("já existe");
    }
}