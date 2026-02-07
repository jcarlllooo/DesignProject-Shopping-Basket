export async function getServerURL() {
  try {
    // List of common local network IP ranges
    const ipRanges = ["192.168.0", "192.168.1", "192.168.68", "192.168.56", "10.0.0"];

    for (let range of ipRanges) {
      for (let i = 1; i < 255; i++) {
        const url = `http://${range}.${i}:4001/ip`;

        try {
          const response = await fetch(url); // no timeout
          if (response.ok) {
            const data = await response.json();
            if (data?.ip && data?.port) {
              return `ws://${data.ip}:${data.port}`;
            }
          }
        } catch (e) {
          // ignore failed attempts
        }
      }
    }

    // Fallback: localhost / emulator defaults
    if (Platform.OS === "android") return "ws://10.0.2.2:4000";
    return "ws://127.0.0.1:4000";
  } catch (e) {
    console.warn("getServerURL failed:", e);
    if (Platform.OS === "android") return "ws://10.0.2.2:4000";
    return "ws://127.0.0.1:4000";
  }
}
