import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// Define drink types and their alcohol content
const DRINK_TYPES = {
  beer: { name: "Beer (5%)", oz: 12, alcoholPercentage: 0.05 },
  lightBeer: { name: "Light Beer (4%)", oz: 12, alcoholPercentage: 0.04 },
  craftBeer: { name: "Craft Beer (7%)", oz: 12, alcoholPercentage: 0.07 },
  wine: { name: "Wine (12%)", oz: 5, alcoholPercentage: 0.12 },
  spirits: { name: "Spirits (40%)", oz: 1.5, alcoholPercentage: 0.4 },
  cocktail: { name: "Cocktail (Mixed)", oz: 8, alcoholPercentage: 0.15 },
};

// Define feeling states with BAC ranges
const FEELING_STATES = [
  {
    state: "Barely Noticeable",
    minBAC: 0.01,
    maxBAC: 0.03,
    description: "Subtle warmth, slightly more relaxed but otherwise normal",
  },
  {
    state: "Pleasantly Relaxed",
    minBAC: 0.04,
    maxBAC: 0.06,
    description: 'Warm "glow", conversation flows easier, mild mood lift',
  },
  {
    state: "Definitely Tipsy",
    minBAC: 0.07,
    maxBAC: 0.09,
    description:
      "Full body warmth, noticeably looser, laughing more, slight buzz",
  },
  {
    state: "Inhibitions Gone",
    minBAC: 0.1,
    maxBAC: 0.12,
    description:
      "Physical coordination starting to change, filter between thoughts and speech weakening",
  },
  {
    state: "Feeling Confident",
    minBAC: 0.13,
    maxBAC: 0.15,
    description:
      "Strong buzz, thoughts seem brilliant (they aren't), possibly louder than normal",
  },
  {
    state: "Overconfident",
    minBAC: 0.16,
    maxBAC: 0.19,
    description: "Very noticeably drunk, balance affected, emotions amplified",
  },
  {
    state: "Memory Blanks",
    minBAC: 0.2,
    maxBAC: 0.25,
    description: "Stumbling, slurred speech, memory formation impaired",
  },
  {
    state: "Unable to Stand",
    minBAC: 0.3,
    maxBAC: 0.5,
    description: "Severe impairment, risk of unconsciousness",
  },
];

// Helper function to calculate BAC
function calculateBAC(weight, gender, drinks, drinkType, hours) {
  // Constants for Widmark formula
  const r = gender === "male" ? 0.68 : 0.55; // Body water constant
  const metabolicRate = 0.015; // Average metabolism rate per hour

  // Calculate total alcohol consumed (in grams)
  const alcoholGrams =
    drinks *
    DRINK_TYPES[drinkType].oz *
    DRINK_TYPES[drinkType].alcoholPercentage *
    29.5735; // Convert oz to ml, then to grams

  // Convert weight from kg to grams
  const weightGrams = weight * 1000;

  // Calculate BAC
  let bac = (alcoholGrams / (weightGrams * r)) * 100;

  // Subtract metabolism over time
  bac = bac - metabolicRate * hours;

  // BAC can't be negative
  return Math.max(0, bac);
}

// Calculate drinks needed to reach a target BAC
function drinksToReachBAC(targetBAC, weight, gender, drinkType) {
  // Constants for Widmark formula
  const r = gender === "male" ? 0.68 : 0.55; // Body water constant

  // Convert weight from kg to grams
  const weightGrams = weight * 1000;

  // Calculate total alcohol needed (in grams)
  const alcoholGrams = (targetBAC * weightGrams * r) / 100;

  // Calculate drinks needed
  return (
    alcoholGrams /
    (DRINK_TYPES[drinkType].oz *
      DRINK_TYPES[drinkType].alcoholPercentage *
      29.5735)
  );
}

// Calculate maintenance drinks per hour (assumed metabolism of 1 standard drink/hour)
function maintenanceDrinksPerHour(drinkType) {
  // Standard drink has 14g of alcohol
  const standardDrinkAlcohol = 14;
  const drinkAlcohol =
    DRINK_TYPES[drinkType].oz *
    DRINK_TYPES[drinkType].alcoholPercentage *
    29.5735;

  return standardDrinkAlcohol / drinkAlcohol;
}

function AlcoholCalculator() {
  // State variables
  const [weight, setWeight] = useState(78);
  const [gender, setGender] = useState("male");
  const [drinkType, setDrinkType] = useState("beer");
  const [compareWeights, setCompareWeights] = useState(false);
  const [compareDrinks, setCompareDrinks] = useState(false);

  // Generate chart data
  const generateChartData = () => {
    const data = [];

    // Generate data points for different number of drinks over 6 hours
    for (let drinks = 1; drinks <= 10; drinks++) {
      const dataPoint = { drinks };

      if (compareWeights) {
        const weights = [50, 70, 90, 110];
        weights.forEach((w) => {
          dataPoint[`${w}kg`] = calculateBAC(w, gender, drinks, drinkType, 1);
        });
      } else if (compareDrinks) {
        Object.keys(DRINK_TYPES).forEach((dt) => {
          dataPoint[DRINK_TYPES[dt].name] = calculateBAC(
            weight,
            gender,
            drinks,
            dt,
            1
          );
        });
      } else {
        dataPoint.bac = calculateBAC(weight, gender, drinks, drinkType, 1);
      }

      data.push(dataPoint);
    }

    return data;
  };

  // Colors for chart lines
  const lineColors = [
    "#8884d8",
    "#82ca9d",
    "#ffc658",
    "#ff8042",
    "#0088fe",
    "#00C49F",
  ];

  return (
    <div className="p-4 max-w-6xl mx-auto bg-gray-50 rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-4 text-center">
        Interactive Alcohol Experience Calculator
      </h1>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-white rounded shadow">
          <h2 className="text-lg font-semibold mb-2">Personal Parameters</h2>
          <div className="mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Weight (kg)
            </label>
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(Number(e.target.value))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
              min="40"
              max="150"
            />
          </div>
          <div className="mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Gender
            </label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
        </div>

        <div className="p-4 bg-white rounded shadow">
          <h2 className="text-lg font-semibold mb-2">Drink Selection</h2>
          <div className="mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Drink Type
            </label>
            <select
              value={drinkType}
              onChange={(e) => setDrinkType(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
            >
              {Object.keys(DRINK_TYPES).map((key) => (
                <option key={key} value={key}>
                  {DRINK_TYPES[key].name}
                </option>
              ))}
            </select>
          </div>
          <div className="text-sm text-gray-600 mt-2">
            <p>Standard serving: {DRINK_TYPES[drinkType].oz} oz</p>
            <p>
              Alcohol content: {DRINK_TYPES[drinkType].alcoholPercentage * 100}%
            </p>
          </div>
        </div>

        <div className="p-4 bg-white rounded shadow">
          <h2 className="text-lg font-semibold mb-2">Comparison Options</h2>
          <div className="mb-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={compareWeights}
                onChange={(e) => {
                  setCompareWeights(e.target.checked);
                  if (e.target.checked) setCompareDrinks(false);
                }}
                className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              />
              <span className="ml-2">Compare different weights</span>
            </label>
          </div>
          <div className="mb-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={compareDrinks}
                onChange={(e) => {
                  setCompareDrinks(e.target.checked);
                  if (e.target.checked) setCompareWeights(false);
                }}
                className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              />
              <span className="ml-2">Compare different drinks</span>
            </label>
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="mb-6 overflow-x-auto">
        <h2 className="text-xl font-semibold mb-2">
          Alcohol Effects by Feeling State
        </h2>
        <table className="min-w-full bg-white border border-gray-200">
          <thead>
            <tr className="bg-gray-100">
              <th className="py-2 px-4 border">Feeling State</th>
              <th className="py-2 px-4 border">BAC Range</th>
              <th className="py-2 px-4 border">How It Feels</th>
              <th className="py-2 px-4 border">
                {DRINK_TYPES[drinkType].name} to Reach
              </th>
              <th className="py-2 px-4 border">Maintenance Over 6 Hours</th>
            </tr>
          </thead>
          <tbody>
            {FEELING_STATES.map((state, index) => {
              const avgBAC = (state.minBAC + state.maxBAC) / 2;
              const drinksNeeded = drinksToReachBAC(
                avgBAC,
                weight,
                gender,
                drinkType
              );
              const maintenanceDrinks = maintenanceDrinksPerHour(drinkType);
              const totalDrinks = Math.round(
                drinksNeeded + maintenanceDrinks * 5
              );

              return (
                <tr
                  key={index}
                  className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}
                >
                  <td className="py-2 px-4 border font-medium">
                    {state.state}
                  </td>
                  <td className="py-2 px-4 border">
                    {state.minBAC.toFixed(2)}-{state.maxBAC.toFixed(2)}%
                  </td>
                  <td className="py-2 px-4 border">{state.description}</td>
                  <td className="py-2 px-4 border">
                    {drinksNeeded <= 0
                      ? "N/A"
                      : `${Math.round(drinksNeeded * 10) / 10} in first hour`}
                  </td>
                  <td className="py-2 px-4 border">
                    {avgBAC >= 0.16 ? (
                      <span className="text-red-600 font-semibold">
                        NOT RECOMMENDED
                      </span>
                    ) : (
                      `~${totalDrinks} total (start with ${Math.round(
                        drinksNeeded
                      )}, then ~${
                        Math.round(maintenanceDrinks * 10) / 10
                      }/hour)`
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Chart */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">BAC Chart</h2>
        <div
          className="bg-white p-4 rounded shadow"
          style={{ height: "400px" }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={generateChartData()}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="drinks"
                label={{
                  value: "Number of Drinks",
                  position: "insideBottomRight",
                  offset: -5,
                }}
              />
              <YAxis
                label={{ value: "BAC %", angle: -90, position: "insideLeft" }}
              />
              <Tooltip />
              <Legend />

              {compareWeights ? (
                [50, 70, 90, 110].map((w, i) => (
                  <Line
                    key={w}
                    type="monotone"
                    dataKey={`${w}kg`}
                    name={`${w}kg person`}
                    stroke={lineColors[i % lineColors.length]}
                    activeDot={{ r: 8 }}
                  />
                ))
              ) : compareDrinks ? (
                Object.keys(DRINK_TYPES).map((dt, i) => (
                  <Line
                    key={dt}
                    type="monotone"
                    dataKey={DRINK_TYPES[dt].name}
                    stroke={lineColors[i % lineColors.length]}
                    activeDot={{ r: 8 }}
                  />
                ))
              ) : (
                <Line
                  type="monotone"
                  dataKey="bac"
                  stroke="#8884d8"
                  activeDot={{ r: 8 }}
                />
              )}

              {/* Add horizontal lines for feeling states */}
              {FEELING_STATES.map((state, i) => (
                <Line
                  key={`state-${i}`}
                  type="monotone"
                  dataKey={() => state.minBAC}
                  stroke={`rgba(0, 0, 0, 0.2)`}
                  strokeDasharray="5 5"
                  dot={false}
                  activeDot={false}
                  name={`${state.state} threshold`}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-lg font-semibold mb-2">Important Notes</h2>
        <ul className="list-disc pl-5 text-sm text-gray-700">
          <li>Your body processes approximately 1 standard drink per hour</li>
          <li>Everyone's metabolism is different - these are approximations</li>
          <li>
            Food in your stomach can significantly slow alcohol absorption
          </li>
          <li>
            Hydration, sleep, and medications can all impact how alcohol affects
            you
          </li>
          <li>Always alternate with water to minimize hangover effects</li>
          <li>Never drive after drinking</li>
        </ul>
      </div>
    </div>
  );
}

export default AlcoholCalculator;
