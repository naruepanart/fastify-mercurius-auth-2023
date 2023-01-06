const Fastify = require("fastify");
const mercurius = require("mercurius");
const mercuriusAuth = require("mercurius-auth");
const jwt = require("jsonwebtoken");

const app = Fastify();

const JWT_SECRET = "my-secret";

const schema = `
  directive @auth on OBJECT | FIELD_DEFINITION

  type Query {
    add(x: Int, y: Int): Math @auth
    add2(x: Int, y: Int): Int
    users: [User]
  }
  type Math {
    plus: Int
    minus: Int
    multiply : Int
    divide: Int
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
    add: async (parent, args, context, info) => {
      const { x, y } = args;
      console.log(context.auth);
      return {
        plus: x + y,
        minus: x - y,
        multiply: x * y,
        divide: x / y,
      };
    },
    add2: async (_, { x, y }) => x * y,
  },
  Mutation: {
    login: async (_, { email, password }) => {
      if (email !== "user@example.com" || password !== "password") {
        throw new Error("Invalid email or password");
      }
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
      identity: context.reply.request.headers["authorization"],
    };
  },
  async applyPolicy(authDirectiveAST, parent, args, context, info) {
    const authHeader = "Bearer " + context.auth.identity;
    if (authHeader) {
      const token = authHeader.split(" ")[1];
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        /* Checking if the user is an admin. If not, it returns. */
        if (!decoded.isAdmin) return;
        /* Adding the decoded JWT to the context.auth object. */
        context.auth.users = decoded;
        return { user: decoded };
      } catch (err) {
        console.error(err);
      }
    }
  },
  authDirective: "auth",
});

app.listen({ port: 3000 });
