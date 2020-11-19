const { ApolloServer, gql } = require('apollo-server');
const axios = require('axios')
const { v4: uuidv4, stringify } = require('uuid');

const bluebird = require('bluebird');
const redis = require('redis');
const client = redis.createClient();

bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);


client.on('connect', function () {
    console.log('connected');
});

const typeDefs = gql` 
  type Query {
    unSplashImages(pageNum: Int!): [ImagePost]
    binnedImages: [ImagePost]
    userPostedImages: [ImagePost]
  }

  type Mutation{
    uploadImage(url: String!, description: String, posterName: String): ImagePost
    updateImage(id: ID!, url: String, posterName: String, description: String, 
        userPosted: Boolean, binned: Boolean) : ImagePost
    deleteImage(id: ID!): ImagePost
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

async function getLen() {

    let redis_len = await client.LLENAsync("Image_List")
    return redis_len

}
async function getImages() {
    let redis_len = await getLen()
    image_list = await client.LRANGEAsync("Image_List", 0, redis_len)
    return image_list
}

async function removeImage(index, image) {
    let image_obj = await client.LREMAsync("Image_List", index, image)
    return image_obj
}


function uploadImageToCache(args) {
    var image = {
        "id": args.id,
        "url": args.url,
        "posterName": args.posterName,
        "description": args.description,
        "userPosted": true,
        "binned": false
    }
    client.rpush("Image_List", JSON.stringify(image))
    return image
}



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
        async binnedImages() {
            let redis_len = await getLen()
            image_list = await client.LRANGEAsync("Image_List", 0, redis_len)
            let binned_images = []
            image_list.map(image_obj => {
                js_obj = JSON.parse(image_obj)
                if (js_obj.binned == true) {
                    binned_images.push(js_obj)
                }
            })
            return binned_images
        },
        async userPostedImages() {

            image_list = await getImages()
            let binned_images = []
            image_list.map(image_obj => {
                js_obj = JSON.parse(image_obj)
                if (js_obj.userPosted == true) {
                    binned_images.push(js_obj)
                }
            })
            return binned_images

        }
    },
    Mutation: {
        async uploadImage(parent, args, context, info) {

            uui = uuidv4()
            var image = {
                "id": uui,
                "url": args.url,
                "posterName": args.posterName,
                "description": args.description,
                "userPosted": true,
                "binned": false
            }


            client.rpush("Image_List", JSON.stringify(image))


            return image
        },
        async updateImage(parent, args, context, info) {
            let image_list = await getImages()
            let curr_image = undefined
            image_list.map(image => {
                image = JSON.parse(image)
                if (image.id == args.id) {

                    curr_image = image

                }

            })

            if (curr_image === undefined) {
                let image = uploadImageToCache(args)
                return image
            }
            else {
                removeImage(0, JSON.stringify(curr_image))
                let image = uploadImageToCache(args)
                return image

            }
        },
        async deleteImage(parent, args, context, info) {
            let image_list = await getImages()
            let index = 0
            let curr_image = null
            image_list.map(image => {
                image = JSON.parse(image)
                if (image.id == args.id) {

                    curr_image = image

                }
                index++
            })
            if (curr_image) {
                let image_obj = await removeImage(0, JSON.stringify(curr_image))
                return image_obj
            }

            return curr_image
        }
    }
};


const server = new ApolloServer({ typeDefs, resolvers });

// The `listen` method launches a web server.
server.listen().then(({ url }) => {
    console.log(`🚀  Server ready at ${url}`);
});
