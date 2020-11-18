const { ApolloServer, gql } = require('apollo-server');
const axios = require('axios')

const typeDefs = gql`
  

  
  type Query {
    unSplashImages(pageNum: Int!): [ImagePost]
  }

  type ImagePost {
    id: ID!
    url: String!
    posterName: String!
    description: String
    userPosted: Boolean!
    binned: Boolean!
}

`;




const resolvers = {
    Query: {
        unSplashImages(pageNum) {
            axios.get
        }
    },
};



const server = new ApolloServer({ typeDefs, resolvers });

// The `listen` method launches a web server.
server.listen().then(({ url }) => {
    console.log(`🚀  Server ready at ${url}`);
});
