import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport"
import { ExtractJwt , Strategy } from "passport-jwt"

export interface   JwtInterface
{
    sub: string;
    email:  string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy)
{
    constructor()
    {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: process.env.JWT_SECRET || 'default_pass',
        });
    }

    async validate(payload: JwtInterface)
    {
        return ({
            userId: payload.sub,
            email: payload.email
        });
    }
}