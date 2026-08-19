/** @type {import('jest').Config} */
export default {
  testEnvironment: "node",
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        tsconfig: {
          module: "commonjs",
          moduleResolution: "node",
          target: "ES2019",
          types: ["google-apps-script", "jest"],
        },
      },
    ],
  },
  testMatch: ["<rootDir>/__tests__/**/*.test.ts"],
};
