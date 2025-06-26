/**
 * Custom ES Module Loader for Node.js Watch Mode
 * Helps resolve path issues with --watch flag
 */

export async function resolve(specifier, context, defaultResolve) {
  try {
    // Use default resolver
    return await defaultResolve(specifier, context);
  } catch (error) {
    // If default resolver fails, provide more detailed error info
    console.error(`❌ Module resolution failed for: ${specifier}`);
    console.error(`Context:`, context);
    throw error;
  }
}

export async function load(url, context, defaultLoad) {
  try {
    // Use default loader
    return await defaultLoad(url, context);
  } catch (error) {
    // If default loader fails, provide more detailed error info
    console.error(`❌ Module load failed for: ${url}`);
    throw error;
  }
}
