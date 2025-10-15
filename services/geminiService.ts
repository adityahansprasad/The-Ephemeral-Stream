const INSPIRATION_WORDS = [
    "Stillness", "Flow", "Source", "Unfold", "Listen", "Breathe", "Resonance",
    "Echo", "Bloom", "Drift", "Calm", "Deep", "Quiet", "Aware", "Present",
    "Open", "Release", "Emerge", "Reflect", "Wander", "Center", "Ground",
    "Peace", "Clarity", "Expand", "Surrender", "Balance", "Harmony", "Ripple",
    "Linger", "Gentle", "Vast", "Infinite", "Serene", "Luminous", "Silence",
    "Grace", "Abide", "Witness", "Space"
];

export const getInspirationWord = (): string => {
    const randomIndex = Math.floor(Math.random() * INSPIRATION_WORDS.length);
    return INSPIRATION_WORDS[randomIndex];
};
