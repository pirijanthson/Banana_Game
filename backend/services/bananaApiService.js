const BANANA_API_URL = process.env.BANANA_API_URL;

const fetchBananaPuzzle = async () => {
  try {
    if (!BANANA_API_URL) {
      throw new Error("BANANA_API_URL is missing in .env");
    }

    const response = await fetch(BANANA_API_URL, {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error("Failed to fetch Banana puzzle.");
    }

    const data = await response.json();

    if (!data.question || data.solution === undefined) {
      throw new Error("Invalid Banana API response.");
    }

    return {
      question: data.question,
      solution: String(data.solution).trim(),
    };
  } catch (error) {
    throw new Error(`Banana API Error: ${error.message}`);
  }
};

module.exports = { fetchBananaPuzzle };
