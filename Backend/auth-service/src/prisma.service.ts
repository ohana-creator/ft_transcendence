import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "../generated/prisma/client";
import {PrismaPg} from "@prisma/adapter-pg"

@Injectable()
export class PrismaService 
extends PrismaClient 
implements OnModuleInit, OnModuleDestroy
{
    constructor()
    {
        const pool = new PrismaPg({connectionStrin: process.env.DATABASE_URL});
        super({ adapter: pool });
    }

    async onModuleInit()
    {
        this.$connect();
    }

    async onModuleDestroy()
    {
        this.$disconnect();
    }
    
}