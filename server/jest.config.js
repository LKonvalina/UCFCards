export default {
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  testTimeout: 180000,
  clearMocks: true,
  collectCoverageFrom: [
    "src/**/*.js",
    "!src/index.js"
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov"],
  coverageThreshold: {
    global: {
      branches: 35,
      functions: 35,
      lines: 40,
      statements: 40
    }
  }
};
