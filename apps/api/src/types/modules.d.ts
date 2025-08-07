// Basic module declarations for missing dependencies

declare module 'express' {
  export interface Request<P = any, ResBody = any, ReqBody = any, ReqQuery = any> {
    user?: {
      userId: string;
      email: string;
      role: string;
      orgId: string;
      orgType: string;
    };
    sessionId?: string;
    body: ReqBody;
    params: P;
    query: ReqQuery;
    ip: string;
    header(name: string): string | undefined;
    get(name: string): string | undefined;
  }
  
  export interface Response<ResBody = any> {
    status(code: number): this;
    json(obj: any): this;
    send(body?: ResBody): this;
  }
  
  export interface NextFunction {
    (): void;
  }
  
  export interface Application {
    use(...args: any[]): this;
    get(path: string, ...handlers: any[]): this;
    post(path: string, ...handlers: any[]): this;
    put(path: string, ...handlers: any[]): this;
    delete(path: string, ...handlers: any[]): this;
    listen(port: number, callback?: () => void): any;
  }
  
  export interface Router {
    get(path: string, ...handlers: any[]): this;
    post(path: string, ...handlers: any[]): this;
    put(path: string, ...handlers: any[]): this;
    delete(path: string, ...handlers: any[]): this;
    patch(path: string, ...handlers: any[]): this;
  }
  
  export function Router(): Router;
  export default function express(): Application & {
    json(options?: any): any;
    urlencoded(options?: any): any;
  };
}

declare module 'pg' {
  export interface PoolConfig {
    connectionString?: string;
    host?: string;
    port?: number;
    database?: string;
    user?: string;
    password?: string;
    max?: number;
    idleTimeoutMillis?: number;
    connectionTimeoutMillis?: number;
    ssl?: boolean | any;
  }
  
  export interface QueryResult<R = any> {
    rows: R[];
    rowCount: number;
  }
  
  export interface PoolClient {
    query<R = any>(text: string, params?: any[]): Promise<QueryResult<R>>;
    release(): void;
  }
  
  export class Pool {
    constructor(config?: PoolConfig);
    connect(): Promise<PoolClient>;
    query<R = any>(text: string, params?: any[]): Promise<QueryResult<R>>;
    end(): Promise<void>;
  }
}

declare module 'redis' {
  export interface RedisClientOptions {
    url?: string;
    host?: string;
    port?: number;
    password?: string;
  }
  
  export interface RedisClientType {
    connect(): Promise<void>;
    quit(): Promise<void>;
    get(key: string): Promise<string | null>;
    set(key: string, value: string, options?: any): Promise<void>;
    setEx(key: string, seconds: number, value: string): Promise<void>;
    incr(key: string): Promise<number>;
    expire(key: string, seconds: number): Promise<number>;
    exists(key: string): Promise<number>;
    del(key: string): Promise<number>;
    lRange(key: string, start: number, stop: number): Promise<string[]>;
    lPush(key: string, ...values: string[]): Promise<number>;
    lTrim(key: string, start: number, stop: number): Promise<void>;
    sAdd(key: string, ...members: string[]): Promise<number>;
    sIsMember(key: string, member: string): Promise<boolean>;
    on(event: string, callback: (err?: any) => void): void;
  }
  
  export function createClient(options?: RedisClientOptions): RedisClientType;
}

declare module 'bcryptjs' {
  export function hash(data: string, saltRounds: number): Promise<string>;
  export function compare(data: string, encrypted: string): Promise<boolean>;
  export function genSalt(rounds?: number): Promise<string>;
}

declare module 'jsonwebtoken' {
  export interface JwtPayload {
    [key: string]: any;
    iss?: string;
    sub?: string;
    aud?: string | string[];
    exp?: number;
    nbf?: number;
    iat?: number;
    jti?: string;
  }
  
  export function sign(payload: any, secretOrPrivateKey: string, options?: any): string;
  export function verify(token: string, secretOrPublicKey: string, options?: any): any;
  export function decode(token: string, options?: any): any;
}

declare module 'cors' {
  export interface CorsOptions {
    origin?: string | string[] | boolean | RegExp | ((origin: string, callback: (err: Error | null, allow?: boolean) => void) => void);
    credentials?: boolean;
    methods?: string | string[];
    allowedHeaders?: string | string[];
  }
  
  export default function cors(options?: CorsOptions): any;
}

declare module 'helmet' {
  export default function helmet(options?: any): any;
}

declare module 'compression' {
  export default function compression(options?: any): any;
}

declare module 'morgan' {
  export default function morgan(format: string, options?: any): any;
}

declare module 'express-rate-limit' {
  export interface RateLimitOptions {
    windowMs?: number;
    max?: number;
    message?: any;
    keyGenerator?: (req: any) => string;
  }
  
  export default function rateLimit(options?: RateLimitOptions): any;
}

declare module 'socket.io' {
  export interface Socket {
    id: string;
    rooms: Set<string>;
    join(room: string): void;
    leave(room: string): void;
    emit(event: string, ...args: any[]): void;
    on(event: string, listener: (...args: any[]) => void): void;
  }
  
  export interface Server {
    on(event: string, listener: (socket: Socket) => void): void;
    emit(event: string, ...args: any[]): void;
  }
  
  export class Server {
    constructor(server?: any, options?: any);
  }
}

declare module 'dotenv' {
  export function config(options?: any): any;
}

declare module 'joi' {
  export interface Schema {
    validate(value: any): { error?: any; value: any };
  }
  
  export function object(schema?: any): Schema;
  export function string(): any;
  export function number(): any;
  export function boolean(): any;
  export function array(): any;
  export function required(): any;
  export function optional(): any;
  export function email(): any;
  export function min(limit: number): any;
  export function max(limit: number): any;
}

declare module 'uuid' {
  export function v4(): string;
}

declare module 'otplib' {
  export namespace authenticator {
    export function generate(secret: string): string;
    export function verify(opts: { token: string; secret: string }): boolean;
    export function generateSecret(): string;
    export function keyuri(user: string, service: string, secret: string): string;
  }
}

declare module 'qrcode' {
  export function toDataURL(text: string, options?: any): Promise<string>;
}

declare module 'multer' {
  export interface MulterFile {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    size: number;
    destination: string;
    filename: string;
    path: string;
    buffer: Buffer;
  }
  
  export default function multer(options?: any): any;
}

declare module 'nodemailer' {
  export interface TransportOptions {
    host?: string;
    port?: number;
    secure?: boolean;
    auth?: {
      user?: string;
      pass?: string;
    };
  }
  
  export interface MailOptions {
    from?: string;
    to?: string;
    subject?: string;
    text?: string;
    html?: string;
  }
  
  export interface Transporter {
    sendMail(mailOptions: MailOptions): Promise<any>;
  }
  
  export function createTransport(options: TransportOptions): Transporter;
}

declare module 'http' {
  export interface Server {
    listen(port: number, callback?: () => void): this;
  }
  
  export function createServer(app: any): Server;
}