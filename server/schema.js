// Imports
const {
    GraphQLSchema,
    GraphQLObjectType,
    GraphQLID,
    GraphQLString,
    GraphQLList,
    GraphQLNonNull,
    GraphQLBoolean,
    GraphQLInt
} = require('graphql');

const {
    GraphQLUpload,
    AuthenticationError
} = require('apollo-server');

const fs = require('fs');

const {
    User,
    Sleep,
    Training,
    Meal
} = require('./models');

// External functions
function generateNoise(l = 256) {
	let a = "",
		b = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890'; // lib

	for(let ma = 0; ma < l; ma++) {
		a += b[Math.floor(Math.random() * b.length)];
	}

	return a;
}

function getDayDate() {
    const a = new Date,
          b = a.getUTCMonth() + 1;
          c = a.getUTCDate();
          d = a.getUTCFullYear();

    return `${ d }/${ b }/${ c }`; // 2019/04/21
}

const str = a => a.toString();

const getExtension = a => a.match(/[^\\]*\.(\w+)$/)[1];

// !IN
const UserType = new GraphQLObjectType({
    name: "User",
    fields: () => ({
        id: { type: GraphQLID },
        login: { type: GraphQLString },
        password: { type: GraphQLString },
        email: { type: GraphQLString },
        avatar: { type: GraphQLString },
        mainActivity: { type: GraphQLString },
        height: { type: GraphQLInt }, // in cm
        age: { type: GraphQLInt },
        firstLogin: { type: GraphQLString },
        authTokens: { type: new GraphQLList(GraphQLString) },
        getMeals: {
            type: new GraphQLList(MealType),
            args: {
                time: { type: GraphQLString }
            },
            async resolve({ id }, { time }) {
                time = +time || +new Date;

                return await Meal.find({
                    creatorID: str(id),
                    $and: [
                        {time: {
                            $gt: time - 86400000
                        }},
                        {time: {
                            $lte: time
                        }}
                    ]
                }).sort({ time: -1 });
            }
        },
        caloriesPerDay: { type: GraphQLInt },
        caloriesToday: {
            type: GraphQLInt,
            async resolve({ id }) {
                const time = +new Date;

                let a = await Meal.find({
                    creatorID: str(id),
                    $and: [
                        {time: {
                            $gt: time - 86400000
                        }},
                        {time: {
                            $lte: time
                        }}
                    ]
                }).select("calories");

                return (a.length) ? (
                    a
                    .map(({ calories: a }) => +a)
                    .reduce((a, b) => a + b)
                ) : 0;
            }
        },
        burnedCaloriesMonth: {
            type: GraphQLInt,
            async resolve({ id, weight }) {
                let a = 0; // calories
                const b = +new Date();

                if(weight) {
                    /*
                        A person who weighs 125 pounds burns approximately
                        38 calories per hour sleeping.

                        125 pounds ~ 56kg

                        :: https://www.healthline.com/health/calories-burned-sleeping#1 ::
                    */

                    let c = await Sleep.find({
                        creatorID: str(id),
                        $and: [
                            {time: {
                                $gt: b - 2678400000
                            }},
                            {time: {
                                $lte: b
                            }}
                        ]
                    }).select("sleepMinutes");

                    if(c.length) {
                        a += c.map(io => io.sleepMinutes / 60).reduce( (a, b) => a + weight / 56 * 38 * b );
                    }
                }

                // Traning
                let c = await Training.find({
                    people: {
                        $in: [str(id)]
                    },
                    $and: [
                        {time: {
                            $gt: b - 86400000
                        }},
                        {time: {
                            $lte: b
                        }}
                    ]
                }).select("destroyedCalories");

                if(c.length) {
                    a += c.map(io => io.destroyedCalories).reduce((a, b) => a + b);
                }

                // Return value
                return Math.floor(a);

            }
        },
        connections: {
            type: new GraphQLList(UserType),
            resolve() {
                // TODO
                return null;
            }
        },
        lastAuthToken: {
            type: GraphQLString,
            resolve: ({ authTokens: a }) => a.slice(-1)[0]
        },
        weight: { type: GraphQLInt },
        sleeps: {
            type: new GraphQLList(SleepType),
            resolve: ({ id }) => Sleep.find({ creatorID: id }).sort({ createTime: -1 })
        },
        trainings: {
            type: new GraphQLList(TrainingType),
            resolve: ({ id }) => Training.find({
                people: {
                    $in: [str(id)]
                }
            })
        },
        avgSleepTime: {
            type: GraphQLInt,
            async resolve({ id }) { // XXX
                const a = await Sleep.find({ creatorID: str(id) }).select("sleepMinutes");

                return (a.length) ? Math.floor(
                    a.map(io => io.sleepMinutes / 60)
                    .reduce((a, b) => a + b) / a.length
                ) : 0;
            }
        },
        connectionsInt: {
            type: GraphQLInt,
            async resolve({ id }) {
                const a = await Training.find({
                    people: {
                        $in: [str(id)]
                    }
                }).select("people");

                /* I could just use Set instead of forEach and an array,
                but it would be bad for the resolver performance */

                if(a.length) {
                    var b = a.map(io => io.people).flat(),
                    c = [];

                    b.forEach( io => (!c.includes(io) && str(io) !== str(id)) ? c.push(io) : null );
                }
            
                return (c) ? c.length : 0;
            }
        },
        appActivity: { type: new GraphQLList(GraphQLString) },
        appActivityMonthGraph: {
            type: new GraphQLList(GraphQLInt), // !IDEA: Scan days - arg
            resolve({ appActivity: actions }) {
                // !:PUSH >> fun getDayDate
                // IDEA: Move this part to the front-end
                    // PROBLEM: The actions array can contain a lot of values, so it's bad for plt. 

                // Get all values that added during the last 30 days
                const tmpMonth = +new Date - 2592000000; // current timestamp - 30 days in milliseconds
                let a = actions.filter(io => {
                    return +new Date(io) >= tmpMonth;
                });

                // Generate freq array
                // [1, 4, 1, 2, 1, 1, 1] -> [{ value: 1, found: 5 }, { value: 4, found: 1 }, ...]
                a = a.map(io => {
                    // Get number of values that describes the same date
                    const values = a.filter(ik => ik === io).length;
                    a = a.filter(ik => ik !== io);
                    return ({
                        day: io,
                        values
                    });
                });
                a = a.filter(io => io.values);

                // Fill up array // XXX: Very dirty
                let aa = [];

                for(let ma = 1; ma <= 30; ma++) {
                    const a_a = new Date(tmpMonth + ma * 86400000),
                        a_b = a_a.getUTCMonth() + 1;
                        a_c = a_a.getUTCDate();
                        a_d = a_a.getUTCFullYear();
            
                    aa.push(`${ a_d }/${ a_b }/${ a_c }`);
                }

                let ab = [];
                const ac = a.map(io => io.day);

                aa.forEach(io => {
                    if(ac.findIndex(ik => ik === io) !== -1) {
                        ab.push(a.find(ik => ik.day === io).values);
                    } else { // add empty day
                        ab.push(0);
                    }
                });

                a = ab;

                return a;
            }
        },
        connectionsSameActivityInt: {
            type: GraphQLInt,
            async resolve({ id, mainActivity }) {
                let a = await Training.find({
                    people: {
                        $in: [str(id)]
                    }
                }).select("people");

                if(!a.length) return 0;

                // --- COPY - PASTE -- //
                const b = a.map(io => io.people).flat(),
                      c = [];

                    b.forEach( io => (!c.includes(io) && str(io) !== str(id)) ? c.push(io) : null ); // ids
                // --- COPY - PASTE -- //

                const d = await User.countDocuments({
                    _id: {
                        $in: c
                    },
                    mainActivity
                });

                return d || 0;
            }
        }
    })
});

const SleepType = new GraphQLObjectType({
    name: "Sleep",
    fields: () => ({
        id: { type: GraphQLID },
        sleepMinutes: { type: GraphQLInt },
        time: { type: GraphQLString },
        rating: { type: GraphQLString },
        creatorID: { type: GraphQLID },
        createTime: { type: GraphQLString },
        creator: {
            type: UserType,
            resolve: ({ creatorID }) => User.findById(creatorID)
        }
    })
});

const TrainingType = new GraphQLObjectType({
    name: "Training",
    fields: () => ({
        id: { type: GraphQLID },
        destroyedCalories: { type: GraphQLInt },
        minutes: { type: GraphQLInt },
        time: { type: GraphQLString },
        action: { type: GraphQLString },
        title: {
            type: GraphQLString,
            resolve: ({ action }) => ({
                "RUNNING_LABEL": "Running",
                "WALKING_LABEL": "Walking",
                "SKIING_LABEL": "Skiing",
                "SWIMMING_LABEL": "swimming",
                "NORDIC_SKIING": "Nordic Skiing",
                "TENNIS_LABEL": "Tennis",
                "FISHING_LABEL": "Fishing",
                "GYM_LABEL": "Gym"
            })[action]
        },
        people: {
            type: new GraphQLList(UserType),
            resolve: ({ people }) => User.find({
                _id: {
                    $in: people
                }
            })
        }
    })
});

const MealType = new GraphQLObjectType({
    name: "Meal",
    fields: () => ({
        id: { type: GraphQLID },
        creatorID: { type: GraphQLID },
        calories: { type: GraphQLInt },
        dishes: { type: new GraphQLList(GraphQLString) },
        time: { type: GraphQLString },
        name: { type: GraphQLString }
    })
});

const RootQuery = new GraphQLObjectType({
    name: "RootQuery",
    fields: {
        users: {
            type: new GraphQLList(UserType),
            resolve: () => User.find({})
        },
        user: {
            type: UserType,
            args: {
                targetID: { type: GraphQLID }
            },
            async resolve(_, { targetID }, { req }) {
                if(!req.session.id || !req.session.authToken) {
                    throw new AuthenticationError("Not authenticated");
                }

                return User.findById(targetID || req.session.id);
            }
        },
        validateUserLogin: {
            type: GraphQLBoolean,
            args: {
                login: { type: new GraphQLNonNull(GraphQLString) }
            },
            async resolve(_, { login }) {
                let a = await User.findOne({ login });
                return !!a;
            }
        },
        getTrainingPeopleSuggestions: {
            type: new GraphQLList(UserType),
            args: {
                offsetID: { type: GraphQLID },
                limit: { type: GraphQLInt },
                login: { type: GraphQLString }
            },
            resolve(_, { offsetID, limit, login }, { req }) {
                if(!req.session.authToken || !req.session.id)
                    throw new AuthenticationError("Not authenticated");

                let a = {
                    _id: {
                        $ne: req.session.id
                    }
                }

                if(offsetID) a._id.$gt = offsetID;
                if(login) a.login = new RegExp(login, "i");

                return User.find(a).limit(limit || 0);
            }
        }
    }
});

const RootMutation = new GraphQLObjectType({
    name: "RootMutation",
    fields: {
        registerUser: {
            type: UserType,
            args: {
                login: { type: new GraphQLNonNull(GraphQLString) },
                password: { type: new GraphQLNonNull(GraphQLString) }
            },
            async resolve(_, { login, password }, { req }) {
                let a = await User.findOne({ login, password });
                if(a) return null;
                
                const token = generateNoise();

                const user = await (new User({
                    login, password,
                    email: "",
                    mainActivity: "",
                    firstLogin: new Date,
                    authTokens: [token],
                    weight: 0,
                    avatar: '/files/default/avatar.png',
                    age: 0,
                    appActivity: [
                        getDayDate()
                    ],
                    height: 0,
                    caloriesPerDay: 2000
                })).save();
                
                req.session.id = str(user._id);
                req.session.authToken = token;

                return user;
            }
        },
        loginUser: {
            type: UserType,
            args: {
                login: { type: new GraphQLNonNull(GraphQLString) },
                password: { type: new GraphQLNonNull(GraphQLString) }
            },
            async resolve(_, { login, password }, { req }) {
                let a = await User.findOne({
                    $or: [
                        { login },
                        { email: login }
                    ],
                    password
                });

                const token = generateNoise();

                if(a) {
                    req.session.id = str(a._id);
                    req.session.authToken = token;
                }

                return a;
            }
        },
        recordMeal: {
            type: MealType,
            args: {
                calories: { type: new GraphQLNonNull(GraphQLInt) },
                dishes: {
                    type: new GraphQLNonNull(
                        new GraphQLList(new GraphQLNonNull(GraphQLString))
                    )
                } 
            },
            async resolve(_, { calories, dishes }, { req }) {
                if(!req.session.authToken || !req.session.id)
                    throw new AuthenticationError("Not authenticated");

                if(calories < 0) return null;

                // Generate name
                let a = ""; // WARNING: Should be empty|false|null here.
                const nl = {
                    "Fastfood": [
                        "pizza",
                        "cheeseburger"
                    ],
                    "Sugar": [
                        "cake"
                    ],
                    "Breakfast": [
                        "sandwich",
                        "cacao",
                        "coffee",
                        "musli"
                    ]
                }

                // NOTE: I hate this fucken IN operator. Burn in hell.
                // Sorry, Steven, no optimization today.... sykablyat

                Object.keys(nl).forEach(io => {
                    if(a) return;

                    const set = nl[io];
                    let on = false;
                    
                    dishes.forEach(ia => {
                        if(on) return;

                        if(set.indexOf(ia.toLowerCase()) !== -1) { // Search value
                            a = io;
                            on = true;
                        }
                    });
                });

                if(!a) a = "Meal";

                // Add to the database
                const b = (new Meal({
                    creatorID: str(req.session.id),
                    calories, dishes,
                    time: +new Date,
                    name: a
                })).save();

                // Record user activity
                await User.findByIdAndUpdate(req.session.id, {
                    $push: {
                        appActivity: getDayDate()
                    }
                });

                // Return item
                return b;
            }
        },
        deleteMeal: {
            type: GraphQLBoolean,
            args: {
                targetID: { type: new GraphQLNonNull(GraphQLID) }
            },
            async resolve(_, { targetID }, { req }) {
                if(!req.session.authToken || !req.session.id)
                    throw new AuthenticationError("Not authenticated");

                await Meal.findOneAndDelete({
                    _id: targetID,
                    creatorID: str(req.session.id)
                });

                return true;
            }
        },
        recordSleep: {
            type: SleepType,
            args: {
                startTime: { type: new GraphQLNonNull(GraphQLString) },
                endTime: { type: new GraphQLNonNull(GraphQLString) },
                rating: { type: new GraphQLNonNull(GraphQLInt) }
            },
            async resolve(_, { startTime, endTime, rating }, { req }) {
                if(!req.session.id || !req.session.authToken)
                    throw new AuthenticationError("Not authenticated");

                const sleep = await (
                    new Sleep({
                        sleepMinutes: Math.abs((+new Date(endTime) - +new Date(startTime)) / 60000),
                        time: +new Date(startTime),
                        creatorID: str(req.session.id),
                        rating: rating,
                        createTime: (+new Date).toString()
                    })
                ).save();

                await User.findByIdAndUpdate(req.session.id, {
                    $push: {
                        appActivity: getDayDate()
                    }
                });

                return sleep;
            }
        },
        deleteSleep: {
            type: GraphQLBoolean,
            args: {
                targetID: { type: new GraphQLNonNull(GraphQLID) }
            },
            async resolve(_, { targetID }, { req }) {
                if(!req.session.id || !req.session.authToken)
                    throw new AuthenticationError("Not authenticated");

                await Sleep.findOneAndDelete({
                    _id: targetID,
                    creatorID: str(req.session.id)
                });

                return true;
            }
        },
        settingAccount: {
            type: UserType,
            args: {
                age: { type: new GraphQLNonNull(GraphQLInt) },
                weight: { type: new GraphQLNonNull(GraphQLInt) },
                height: { type: new GraphQLNonNull(GraphQLInt) },
                caloriesPerDay: { type: new GraphQLNonNull(GraphQLInt) },
                login: { type: new GraphQLNonNull(GraphQLString) },
                email: { type: new GraphQLNonNull(GraphQLString) },
                mainActivity: { type: new GraphQLNonNull(GraphQLString) }
            },
            async resolve(_, { age, weight, height, login, email, mainActivity, caloriesPerDay }, { req }) {
                if(!req.session.id || !req.session.authToken)
                    throw new AuthenticationError("Not authenticated");

                let a = await User.findById(req.session.id);

                const b = {}
                if(age) b.age = age;
                if(weight) b.weight = weight;
                if(height) b.height = height;
                if(login) b.login = login;
                if(email) b.email = email;
                if(mainActivity) b.mainActivity = mainActivity;
                if(caloriesPerDay) b.caloriesPerDay = caloriesPerDay;

                await a.updateOne(b);

                return ({
                    ...a,
                    ...b
                });
            }
        },
        setAccountAvatar: {
            type: UserType,
            args: {
                avatar: { type: new GraphQLNonNull(GraphQLUpload) }
            },
            async resolve(_, { avatar }, { req }) {
                if(!req.session.id || !req.session.authToken)
                    throw new AuthenticationError("Not authenticated");

                // Receive image
                let { stream, filename } = await avatar;
                const avatarP = '/files/avatars/' + generateNoise(128) + '.' + getExtension(filename);
                stream.pipe(fs.createWriteStream('.' + avatarP));

                return User.findOneAndUpdate({
                    _id: req.session.id
                }, {
                    avatar: avatarP
                }, (_, a) => a);
            }
        },
        createTraining: {
            type: TrainingType,
            args: {
                calories: { type: new GraphQLNonNull(GraphQLInt) },
                minutes: { type: new GraphQLNonNull(GraphQLInt) },
                action: { type: new GraphQLNonNull(GraphQLString) },
                peopleID: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLID))) } 
            },
            async resolve(_, { calories, minutes, action, peopleID }, { req }) {
                if(!req.session.id || !req.session.authToken)
                    throw new AuthenticationError("Not authenticated");

                const people = [
                    ...peopleID.map(io => str(io)),
                    str(req.session.id)
                ];

                const a = (
                    new Training({
                        destroyedCalories: calories,
                        minutes,
                        time: +new Date,
                        action,
                        people
                    })
                ).save();
                
                // Record users activity
                await User.updateMany({
                    _id: {
                        $in: people
                    }
                }, {
                    $push: {
                        appActivity: getDayDate()
                    }
                });

                // Return training
                return a;
            }
        }
    }
});

// const RootSubscription = new GraphQLObjectType({
//     name: "RootSubscription",
//     fields: {}
// });

module.exports = new GraphQLSchema({
    query: RootQuery,
    mutation: RootMutation,
    // subscription: RootSubscription
});