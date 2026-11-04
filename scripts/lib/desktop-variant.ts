export function resolveDesktopVariant(name = "t3code") {
  if (name !== "t3code" && name !== "orbit") {
    throw new Error(`Unknown desktop variant: ${name}`);
  }
  const clientOnly = name === "orbit";
  return {
    clientOnly,
    baseName: clientOnly ? "T3 Orbit" : "T3 Code",
    appId: clientOnly ? "com.liltaket.t3orbit" : "com.t3tools.t3code",
    scheme: clientOnly ? "t3code-orbit" : "t3code",
    devScheme: clientOnly ? "t3code-orbit-dev" : "t3code-dev",
    profile: clientOnly ? "t3-orbit" : "t3code-v2",
    devProfile: clientOnly ? "t3-orbit-dev" : "t3code-dev",
    home: clientOnly ? ".t3-orbit" : ".t3",
  };
}
