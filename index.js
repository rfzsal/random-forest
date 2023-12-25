require("dotenv").config();
const { RandomForestClassifier } = require("ml-random-forest");
const express = require("express");
const app = express();
app.use(express.json());

// Assume 'startups' is your list of startups
const startups = require("./startup.json");

const criteria = {
  namaBadanHukum: "CV",
  sektor: "",
  provinsi: "KALIMANTAN BARAT",
  sistemPenjualan: "",
  jenisUsaha: "",
};

const isValidCriteria = (criteria) => {
  const requiredKeys = [
    "namaBadanHukum",
    "sektor",
    "provinsi",
    "sistemPenjualan",
    "jenisUsaha",
  ];
  return requiredKeys.every((key) => Object.keys(criteria).includes(key));
};

const predictStartup = (criteria) => {
  if (!isValidCriteria(criteria)) {
    return new Error("Invalid criteria object");
  }

  if (
    !Array.isArray(startups) ||
    !startups.every(
      (startup) =>
        typeof startup === "object" &&
        startup.hasOwnProperty("namaBadanHukum") &&
        startup.hasOwnProperty("sektor") &&
        startup.hasOwnProperty("provinsi") &&
        startup.hasOwnProperty("sistemPenjualan") &&
        startup.hasOwnProperty("jenisUsaha"),
    )
  ) {
    return new Error("Invalid startups array");
  }

  // Extract the unique provinces from the startups
  let provinces = Array.from(
    new Set(startups.map((startup) => startup["provinsi"])),
  ).sort();

  // Extract the unique sectors from the startups
  let sectors = Array.from(
    new Set(startups.map((startup) => startup["sektor"])),
  ).sort();

  // Extract the unique business types from the startups
  let jenisUsaha = Array.from(
    new Set(startups.map((startup) => startup["jenisUsaha"])),
  ).sort();

  // Extract the unique legal entities from the startups
  let legalEntities = Array.from(
    new Set(startups.map((startup) => startup["namaBadanHukum"])),
  ).sort();

  // Extract the unique sales systems from the startups
  let salesSystems = Array.from(
    new Set(startups.map((startup) => startup["sistemPenjualan"])),
  ).sort();

  if (
    !legalEntities.length ||
    !sectors.length ||
    !provinces.length ||
    !salesSystems.length ||
    !jenisUsaha.length ||
    !startups.length
  ) {
    return new Error("One or more arrays are empty");
  }

  // Shuffle the startups
  startups.sort(() => Math.random() - 0.5);

  // Split the startups into a training set and a test set
  let trainSize = Math.floor(startups.length * 0.7);
  let trainStartups = startups.slice(0, trainSize);
  let testStartups = startups.slice(trainSize);

  // Prepare your training set and predictions
  let trainingSet = trainStartups.map((startup) => [
    legalEntities.includes(startup["namaBadanHukum"])
      ? legalEntities.indexOf(startup["namaBadanHukum"])
      : 0,
    sectors.includes(startup["sektor"])
      ? sectors.indexOf(startup["sektor"])
      : 0,
    provinces.includes(startup["provinsi"])
      ? provinces.indexOf(startup["provinsi"])
      : 0,
    salesSystems.includes(startup["sistemPenjualan"])
      ? salesSystems.indexOf(startup["sistemPenjualan"])
      : 0,
    jenisUsaha.includes(startup["jenisUsaha"])
      ? jenisUsaha.indexOf(startup["jenisUsaha"])
      : 0,
  ]);

  let startupNames = [];
  let startupPredictions = [];

  startups.forEach((startup) => {
    // Define your criteria
    let trainingCriteria = criteria;

    // Check if at least two criteria are true
    let matches = Object.keys(trainingCriteria).reduce(
      (count, key) => count + (startup[key] === trainingCriteria[key]),
      0,
    );

    // Store the startup name and prediction separately
    startupNames.push(startup.namaPerusahaan);
    startupPredictions.push(matches ? 1 : 0);
  });

  // Initialize the model
  let options = {
    seed: 42,
    maxFeatures: 5,
    replacement: true,
    nEstimators: 500,
    treeOptions: {
      minNumSamples: 1,
    },
  };

  const classifier = new RandomForestClassifier(options);
  classifier.train(trainingSet, startupPredictions.slice(0, trainSize));

  // // Prepare your test set
  // let testSet = testStartups.map((startup) => [
  //   legalEntities.includes(startup["namaBadanHukum"])
  //     ? legalEntities.indexOf(startup["namaBadanHukum"])
  //     : 0,
  //   sectors.includes(startup["sektor"])
  //     ? sectors.indexOf(startup["sektor"])
  //     : 0,
  //   provinces.includes(startup["provinsi"])
  //     ? provinces.indexOf(startup["provinsi"])
  //     : 0,
  //   salesSystems.includes(startup["sistemPenjualan"])
  //     ? salesSystems.indexOf(startup["sistemPenjualan"])
  //     : 0,
  //   jenisUsaha.includes(startup["jenisUsaha"])
  //     ? jenisUsaha.indexOf(startup["jenisUsaha"])
  //     : 0,
  // ]);

  // // Use the trained model to make predictions on the test set
  // let testPredictions = classifier.predict(testSet);

  // // Calculate the accuracy of the model on the test set
  // let accuracy =
  //   testPredictions.reduce(
  //     (correct, prediction, index) =>
  //       prediction === testPredictions[index] ? correct + 1 : correct,
  //     0,
  //   ) / testPredictions.length;

  // // Print the accuracy of the model
  // console.log(`Accuracy of the model on the test set: ${accuracy}`);

  let matchingStartups = [];

  startups.forEach((startup) => {
    // Encode the startup's attributes as a feature vector
    let instance = [
      legalEntities.includes(startup["namaBadanHukum"])
        ? legalEntities.indexOf(startup["namaBadanHukum"])
        : 0,
      sectors.includes(startup["sektor"])
        ? sectors.indexOf(startup["sektor"])
        : 0,
      provinces.includes(startup["provinsi"])
        ? provinces.indexOf(startup["provinsi"])
        : 0,
      salesSystems.includes(startup["sistemPenjualan"])
        ? salesSystems.indexOf(startup["sistemPenjualan"])
        : 0,
      jenisUsaha.includes(startup["jenisUsaha"])
        ? jenisUsaha.indexOf(startup["jenisUsaha"])
        : 0,
    ];

    // Use the trained model to make a prediction
    let prediction = classifier.predict([instance]);

    // If the prediction is true, add the startup to the list of matching startups
    if (prediction[0] === 1) {
      matchingStartups.push(startup);
    }
  });

  // Print the list of matching startups
  // console.log(`Total number of matching startup: ${matchingStartups.length}`);
  return matchingStartups;
};

app.get("/", (req, res) => {
  const matchingStartups = predictStartup(criteria);

  // Return the matching startups
  res.json({ criteria, matching: matchingStartups });
});

app.post("/", (req, res) => {
  const matchingStartups = predictStartup(req.body.criteria);

  // Return the matching startups
  res.json({ criteria: req.body.criteria, matching: matchingStartups });
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Server is listening on port 3000");
});
