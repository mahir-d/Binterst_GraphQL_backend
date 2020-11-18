const { ApolloServer, gql } = require('apollo-server');
const axios = require('axios')
const { v4: uuidv4, stringify } = require('uuid');
const redis = require("redis");
const client = redis.createClient();
const asyncRedis = require("async-redis");
const asyncRedisClient = asyncRedis.decorate(client);

client.on('connect', function () {
    console.log('connected');
});

const typeDefs = gql` 
  type Query {
    unSplashImages(pageNum: Int!): [ImagePost]
    binnedImages: [ImagePost]
  }

  type Mutation{
    uploadImage(url: String!, description: String, posterName: String): ImagePost
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
        async unSplashImages(parent, args, context, info) {
            const { data } = await axios.get(`https://api.unsplash.com/photos/?page=${args.pageNum};client_id=8TmiRmr-VDl-9VRtK7Ez4-F01YD1mSOsmmvyOgWh7JM`)

            const reponse = data
            return reponse.map(image => {
                var image = {
                    "id": uuidv4(),
                    "url": image.urls.regular,
                    "posterName": image.user.name,
                    "description": image.description || image.alt_description,
                    "userPosted": false,
                    "binned": false
                }
                return image
            })
        },
        binnedImages() {
            function callLLen() {
                client.LLEN("Image_List", function (err, reply) {

                    return reply

                })
            }

            function rtrn_data(i, binned_images) {
                client.lindex("Image_List", i, function (err, reply) {
                    js_obj = JSON.parse(reply)
                    console.log(`json = ${js_obj.binned}`)
                    if (js_obj.binned) {
                        binned_images.push({ "id": js_obj.id, "url": js_obj.url, "posterName": js_obj.posterName, "description": js_obj.description, "userPosted": js_obj.userPosted, "binned": js_obj.binned })

                    }
                    return binned_images
                })
            }

            function callIndex() {
                var binned_images = []
                console.log(`len = ${callLLen()}`)
                for (i = 0; i < callLLen(); i++) {
                    binned_images = rtrn_data(i, binned_images)
                }

                return binned_images
            }

            return callIndex()


        }
    },
    Mutation: {
        async uploadImage(parent, args, context, info) {
            console.log(args)
            uui = uuidv4()
            var image = {
                "id": uui,
                "url": args.url,
                "posterName": args.posterName,
                "description": args.description,
                "userPosted": true,
                "binned": true
            }
            u_id = uui.toString()

            client.rpush("Image_List", JSON.stringify(image))


            return image
        }
    }
};


const server = new ApolloServer({ typeDefs, resolvers });

// The `listen` method launches a web server.
server.listen().then(({ url }) => {
    console.log(`🚀  Server ready at ${url}`);
});
