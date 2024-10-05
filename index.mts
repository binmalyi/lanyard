const UserId=/^[0-9]{16,19}$/;

export type Snowflake = `${bigint}`;
export type Subscription = Array<Snowflake> | Snowflake | true;
type Send = {subscribe_to_id: string} | {subscribe_to_ids: Array<Snowflake>} | {subscribe_to_all: true};
type Status = "online" | "idle" | "dnd" | "offline";
type Identify<X> = X extends Snowflake ? Presence : Array<Presence>;

interface InitState {seq: 1, t: "INIT_STATE"};
interface PresenceUpdate {seq: 2, t: "PRESENCE_UPDATE"};
type Event = {op: 0, d: Receive | Record<Snowflake,Receive>} & (InitState | PresenceUpdate);
interface Hello {op: 1, d: Record<"heartbeat_interval",number>};
interface Initialize {op: 2, d: Send};
interface Heartbeat {op: 3};

export interface User {
    id: Snowflake,
    username: string,
    avatar: string | null,
    discriminator: string,
    bot: boolean,
    clan: Clan | null,
    global_name: string,
    avatar_decoration_data: AvatarDecoration | null,
    display_name: string,
    public_flags: number
};

export interface Clan {
    tag: string,
    badge: string,
    identity_enabled: boolean,
    identity_guild_id: number
};

export interface AvatarDecoration {
    asset: string,
    expires_at: number | null,
    sku_id: number
};

export interface Spotify {
    timestamps: {
        start: number,
        end: number
    },
    album: string,
    album_art_url: string,
    artist: string,
    song: string,
    track_id: string
};

export interface Receive {
    kv: Record<string,string> | null,
    spotify: Spotify | null,
    discord_user: User,
    activities: Array<Record<string,unknown>>,
    discord_status: Status,
    active_on_discord_web: boolean,
    active_on_discord_mobile: boolean,
    active_on_discord_desktop: boolean,
    listening_to_spotify: boolean
};

export interface Error {
    success: false,
    error: {
        code: string,
        message: string
    }
};

export interface Success {
    success: true,
    data: Receive
};

export type Response = Error | Success;

export interface Presence {
    user: User,
    status: Status,
    device: "Web" | "Desktop" | "Mobile" | null,
    activities: Receive["activities"],
    spotify: Receive["spotify"]  
};

/** @description Text Encoder */
export function encode(data: unknown){
    return new TextEncoder().encode(typeof data === "string" ? data : JSON.stringify(data));
};

/** @description Text Decoder */
export function decode(array: Uint8Array){
    return new TextDecoder().decode(array);
};

/** @description Mutate API data */
function transform(data: Receive): Presence {
    return {
        user: data.discord_user,
        spotify: data.spotify,
        status: data.discord_status,
        device: data.active_on_discord_desktop ? "Desktop" : (data.active_on_discord_mobile ? "Mobile" : (data.active_on_discord_web ? "Web" : null)),
        activities: data.activities
    } satisfies Presence;
};

export class Lanyard<Subscriber extends Subscription = Snowflake> {
    private _ws!: WebSocket;
    private _data!: Uint8Array;
    private _heartbeat!: number;

    constructor(subscription?: Subscriber){
        this.connect(subscription);
    };

    /** @description Fetch user via REST API */
    static async Fetch(user: Snowflake = process.env["LANYARDID"]! as Snowflake){
        if (!user || typeof user !== "string") throw new Error("Invalid Parameter");

        const res = (await (await fetch("https://api.lanyard.rest/v1/users/"+user)).json()) as Response;

        return res.success ? Promise.resolve(transform(res.data)) : Promise.reject(res.error);
    };

    /** @description Establish WebSocket connection */
    public connect(subscription: Subscriber = process.env["LANYARDID"] as Subscriber){
        if (!subscription || (Array.isArray(subscription) && subscription.every(i => !UserId.test(i))) || (typeof subscription === "string" && !UserId.test(subscription))) throw new TypeError("Invalid Parameters");

        if (this._ws && (this._ws.readyState < 2)) throw new Error("Alive WebSocket Session");

        this._ws = new WebSocket("wss://api.lanyard.rest/socket");
    
        this._ws.onopen = this._ws.send.bind(this._ws, JSON.stringify({op: 2, d: subscription === !0 ? {subscribe_to_all: !0} : (typeof subscription === "string" ? {subscribe_to_id: subscription} : {subscribe_to_ids: subscription})} satisfies Initialize));

        this._ws.onmessage = ({data}: Record<"data",string>) => {
            const {op, d} = JSON.parse(data) as Hello | Event;
            switch (op){
                case 1:
                    return void (this._heartbeat=d.heartbeat_interval);

                default:
                    return void (this._data=encode(d), setTimeout(() => this._ws.send(JSON.stringify({op:3} satisfies Heartbeat)), this._heartbeat));
            };
        };

        this._ws.onclose = (event) => {
            if (event.code !== 1000) this.connect(subscription);
        };
    };

    /** @description Disconnect the websocket */
    public disconnect(){
        if (this._ws && (this._ws.readyState < 2)) this._ws.close();
    };

    /** @description Presence of subscribers */
    public get presence(){
        if (!this._data) return null;
        const data = JSON.parse(decode(this._data)) as Receive | Record<Snowflake,Receive>;
        return ("kv" in data ? transform(data) : Object.values(data).map(transform.bind(transform)).slice(0,100)) as Identify<Subscriber>;
    };
};