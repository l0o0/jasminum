export function test(title: string) {
  const startTimestamp = Date.now();
  let result = title;
  for (let i = 0; i < 100; i++) {
    // console.log("test", i);
    result = result
      .split("")
      .map((c) => String.fromCharCode(c.charCodeAt(0) + 1))
      .join("");
  }
  const endTimestamp = Date.now();
  const time = endTimestamp - startTimestamp;
  return { result, time };
}
