#include <iostream>
#include <express.h>
#include <mongoose.h>
#include <fstream>
#include <rate_limit.h>
#include <jwt.h>
#include <dotenv.h>

int main() {
    express::Express app;
    mongoose::Mongoose mongoose;
    std::fstream fs;
    rate_limit::RateLimit rateLimit;
    jwt::JWT jwt;
    dotenv::Config config;
    config.load();

    // not done still have to add more

    return 0;
}
