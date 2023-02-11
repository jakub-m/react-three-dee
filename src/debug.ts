export function loggableObject(obj: any): any {
  return JSON.parse(JSON.stringify(obj));
}
