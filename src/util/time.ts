export function getTime(t: number): string {
    return new Date(t * 1000).toLocaleDateString("nl-NL", {
      day: "numeric",
      month: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    });
  }
  
  export function now(): number {
    const date = new Date();
    return Math.round(date.valueOf() / 1000);
  }
  
  export const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
