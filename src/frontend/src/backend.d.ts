import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export interface UserPreferences {
    globalMatching: boolean;
    privacyLevel: string;
    voiceEnabled: boolean;
    videoEnabled: boolean;
}
export interface TransformationOutput {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export type Time = bigint;
export interface RazorpayConfiguration {
    secretKey: string;
    apiKey: string;
}
export interface http_header {
    value: string;
    name: string;
}
export interface YoutubeSessionState {
    lastUpdated: Time;
    version: bigint;
    isPlaying: boolean;
    playbackPosition: bigint;
    videoId: string;
}
export interface Subscription {
    endDate?: Time;
    type: SubscriptionType;
    user: Principal;
    isActive: boolean;
    startDate: Time;
}
export interface http_request_result {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface ShoppingItem {
    productName: string;
    currency: string;
    quantity: bigint;
    priceInCents: bigint;
    productDescription: string;
}
export interface TransformationInput {
    context: Uint8Array;
    response: http_request_result;
}
export interface SignalingData {
    offer?: string;
    lastUpdated: Time;
    answer?: string;
    iceCandidates: Array<string>;
}
export type StripeSessionStatus = {
    __kind__: "completed";
    completed: {
        userPrincipal?: string;
        response: string;
    };
} | {
    __kind__: "failed";
    failed: {
        error: string;
    };
};
export interface StripeConfiguration {
    allowedCountries: Array<string>;
    secretKey: string;
}
export interface UserProfile {
    age: bigint;
    bio: string;
    kycVerified: boolean;
    name: string;
    onboardingComplete: boolean;
    preferences: UserPreferences;
    profilePicture?: ExternalBlob;
    location: string;
}
export enum SubscriptionType {
    basicPremium = "basicPremium",
    globalMatching = "globalMatching",
    videoCalling = "videoCalling",
    adFree = "adFree",
    premiumBundle = "premiumBundle"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addSubscription(subscription: Subscription): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    cleanupSignalingState(peer: Principal): Promise<void>;
    cleanupYouTubeSessionState(peer: Principal): Promise<void>;
    completeOnboarding(): Promise<void>;
    createCheckoutSession(items: Array<ShoppingItem>, successUrl: string, cancelUrl: string): Promise<string>;
    createOffer(peer: Principal, offer: string): Promise<void>;
    createRazorpayOrder(amount: bigint, currency: string): Promise<string>;
    exchangeCandidates(peer: Principal, candidate: string): Promise<void>;
    findRandomPeer(): Promise<Principal | null>;
    getActiveUserCount(): Promise<bigint>;
    getAds(): Promise<Array<string>>;
    getCallerSubscription(): Promise<Subscription | null>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getFriends(): Promise<Array<Principal>>;
    getSignalingState(peer: Principal): Promise<SignalingData | null>;
    getStripeSessionStatus(sessionId: string): Promise<StripeSessionStatus>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getYouTubeSessionState(peer: Principal): Promise<YoutubeSessionState | null>;
    initializeAccessControl(): Promise<void>;
    isCallerAdmin(): Promise<boolean>;
    isInMatchmakingPool(): Promise<boolean>;
    isRazorpayConfigured(): Promise<boolean>;
    isStripeConfigured(): Promise<boolean>;
    isVoiceReady(): Promise<boolean>;
    joinMatchmakingPool(): Promise<void>;
    leaveMatchmakingPool(): Promise<void>;
    matchWithPeer(peer: Principal): Promise<string>;
    nextPeer(): Promise<Principal | null>;
    removeInactiveUsers(): Promise<void>;
    respondToFriendRequest(requestId: string, accept: boolean): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    sendAnswer(peer: Principal, answer: string): Promise<void>;
    sendFriendRequest(to: Principal): Promise<string>;
    setRazorpayConfiguration(config: RazorpayConfiguration): Promise<void>;
    setStripeConfiguration(config: StripeConfiguration): Promise<void>;
    setYouTubeSessionState(peer: Principal, state: YoutubeSessionState): Promise<void>;
    terminateSession(peer: Principal): Promise<void>;
    transform(input: TransformationInput): Promise<TransformationOutput>;
    updateActivity(): Promise<void>;
    updateKycStatus(user: Principal, verified: boolean): Promise<void>;
    verifyRazorpayPayment(orderId: string, paymentId: string, signature: string): Promise<void>;
}
