export function sleep(sec: number): Promise<void> {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, sec * 1000);
  });
}
