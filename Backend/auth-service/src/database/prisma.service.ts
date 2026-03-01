import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "../../generated/prisma/client";
import {PrismaPg} from "@prisma/adapter-pg"

@Injectable()
export class PrismaService 
extends PrismaClient 
implements OnModuleInit, OnModuleDestroy
{
    constructor()
    {
        console.log('im on prisma.service.ts contructor, and imma show the database_url env');
        console.log(`${process.env.DATABASE_URL}`);
        const pool = new PrismaPg({connectionString: process.env.DATABASE_URL});
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