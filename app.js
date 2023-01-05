const Fastify = require("fastify");
const mercurius = require("mercurius");
const mercuriusAuth = require("mercurius-auth");
const jwt = require("jsonwebtoken");

const app = Fastify();

const JWT_SECRET = "my-secret";

const schema = `
  directive @auth on OBJECT | FIELD_DEFINITION

  type Query {
    add(x: Int, y: Int): Int @auth
    add2(x: Int, y: Int): Int
    users: [User]
  }
  type User {
    id: ID!
    name: String!
  }

  type Mutation {
    login(email: String, password: String): String
  }
`;

const resolvers = {
  Query: {
    add: async (_, { x, y }) => x + y,
    add2: async (_, { x, y }) => x * y,
  },
  Mutation: {
    login: async (_, { email, password }) => {
      // Validate the email and password
      // (in a real application, you would query a database here)
      if (email !== "user@example.com" || password !== "password") {
        throw new Error("Invalid email or password");
      }

      // Create a JWT and return it
      return jwt.sign({ sub: "user@example.com", isAdmin: true }, JWT_SECRET);
    },
  },
};

app.register(mercurius, {
  schema,
  resolvers,
  graphiql: true,
});

app.register(mercuriusAuth, {
  authContext(context) {
    return {
      identity: context.reply.request.headers["x-user"],
    };
  },
  async applyPolicy(authDirectiveAST, parent, args, context, info) {
    const auth = "Bearer " + context.auth.identity;
    if (auth) {
      const token = auth.split(" ")[1];
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (!decoded.isAdmin) return;
        return { user: decoded };
      } catch (err) {
        console.error(err);
      }
    }
  },
  authDirective: "auth",
});

app.listen({ port: 3000 });
