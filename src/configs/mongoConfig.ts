export const mongoConfig = {
  mongoURI: process.env.MONGODB_URL,
  mongoSetup: {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  },
};
