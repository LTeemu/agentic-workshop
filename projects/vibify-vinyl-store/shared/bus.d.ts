export function on(event: string, fn: (data: any) => void): () => void;
export function emit(event: string, data?: any): void;
