import React, { useMemo, useState } from "react";
import L from "leaflet";

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle
} from "react-leaflet";

import "leaflet/dist/leaflet.css";

function RiskIntelligence({
  locations = [],
  predictions = []
}) {

  const [selectedLocation, setSelectedLocation] =
    useState(null);

  /* =====================================================
     RISK COLOR
  ===================================================== */

  const getRiskColor = (level) => {

    switch (level) {

      case "Critical":
        return "#dc2626";

      case "Warning":
        return "#f97316";

      case "Watch":
        return "#eab308";

      case "Normal":
        return "#16a34a";

      default:
        return "#64748b";
    }
  };

  /* =====================================================
     COMBINE SENSOR + PREDICTION DATA
  ===================================================== */

  const riskLocations = useMemo(() => {

    return locations.map((location) => {

      const prediction =
        predictions.find(
          (item) =>
            Number(item.location_id) ===
            Number(location.location_id)
        );

      return {
        ...location,
        prediction
      };

    });

  }, [locations, predictions]);

  /* =====================================================
     RISK ICON
  ===================================================== */

  const createRiskIcon = (riskLevel) => {

    const color =
      getRiskColor(riskLevel);

    return L.divIcon({

      className: "custom-risk-marker",

      html: `
        <div class="risk-marker-wrapper">

          <div
            class="risk-marker-pulse"
            style="
              background:${color};
              box-shadow:0 0 0 7px ${color}22;
            "
          ></div>

          <div
            class="risk-marker-core"
            style="
              background:${color};
            "
          ></div>

        </div>
      `,

      iconSize: [30, 30],
      iconAnchor: [15, 15]

    });

  };

  /* =====================================================
     SELECT LOCATION
  ===================================================== */

  const handleLocationSelect = (location) => {

    setSelectedLocation(location);

  };

  /* =====================================================
     SELECTED DATA
  ===================================================== */

  const selected =
    selectedLocation?.prediction;

  return (

    <div className="risk-intelligence-page">

      {/* =================================================
          PAGE INTRO
      ================================================= */}

      <section className="risk-page-header">

        <div>

          <span className="section-label">
            SPATIAL RISK INTELLIGENCE
          </span>

          <h2>
            Landslide Risk Intelligence
          </h2>

          <p>
            Explore monitored locations across the
            North Eastern Region and inspect their
            current environmental and stability
            indicators.
          </p>

        </div>

        <div className="risk-page-status">

          <span className="live-dot"></span>

          <div>
            <strong>
              Live Spatial Monitoring
            </strong>

            <small>
              {riskLocations.length} monitored zones
            </small>
          </div>

        </div>

      </section>

      {/* =================================================
          RISK SUMMARY
      ================================================= */}

      <section className="risk-summary-grid">

        <div className="risk-summary-card">

          <span>
            CRITICAL
          </span>

          <strong>
            {
              riskLocations.filter(
                (item) =>
                  item.prediction?.risk_level ===
                  "Critical"
              ).length
            }
          </strong>

          <small>
            Immediate attention
          </small>

        </div>

        <div className="risk-summary-card">

          <span>
            WARNING
          </span>

          <strong>
            {
              riskLocations.filter(
                (item) =>
                  item.prediction?.risk_level ===
                  "Warning"
              ).length
            }
          </strong>

          <small>
            Elevated risk
          </small>

        </div>

        <div className="risk-summary-card">

          <span>
            WATCH
          </span>

          <strong>
            {
              riskLocations.filter(
                (item) =>
                  item.prediction?.risk_level ===
                  "Watch"
              ).length
            }
          </strong>

          <small>
            Increased observation
          </small>

        </div>

        <div className="risk-summary-card">

          <span>
            NORMAL
          </span>

          <strong>
            {
              riskLocations.filter(
                (item) =>
                  !item.prediction ||
                  item.prediction?.risk_level ===
                  "Normal"
              ).length
            }
          </strong>

          <small>
            Stable monitoring
          </small>

        </div>

      </section>

      {/* =================================================
          MAP + DETAILS
      ================================================= */}

      <section className="risk-map-layout">

        {/* MAP */}

        <div className="panel intelligence-map-panel">

          <div className="panel-heading">

            <div>

              <span className="section-label">
                REGIONAL MAP
              </span>

              <h3>
                NER Risk Distribution
              </h3>

            </div>

            <span className="map-live-label">
              ● LIVE
            </span>

          </div>

          <div className="intelligence-map">

            <MapContainer
              center={[25.8, 91.8]}
              zoom={6}
              scrollWheelZoom={true}
              style={{
                width: "100%",
                height: "100%"
              }}
            >

              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {riskLocations.map(
                (location) => {

                  const prediction =
                    location.prediction;

                  const level =
                    prediction?.risk_level ||
                    "Normal";

                  const color =
                    getRiskColor(level);

                  const latitude =
                    Number(
                      location.latitude
                    );

                  const longitude =
                    Number(
                      location.longitude
                    );

                  if (
                    Number.isNaN(latitude) ||
                    Number.isNaN(longitude)
                  ) {
                    return null;
                  }

                  return (

                    <React.Fragment
                      key={location.id}
                    >

                      {/* RISK AREA */}

                      <Circle
                        center={[
                          latitude,
                          longitude
                        ]}
                        radius={
                          level === "Critical"
                            ? 22000
                            : level === "Warning"
                            ? 16000
                            : 10000
                        }
                        pathOptions={{
                          color,
                          fillColor: color,
                          fillOpacity: 0.08,
                          weight: 1
                        }}
                      />

                      {/* MARKER */}

                      <Marker
                        position={[
                          latitude,
                          longitude
                        ]}
                        icon={createRiskIcon(level)}
                        eventHandlers={{
                          click: () =>
                            handleLocationSelect(
                              location
                            )
                        }}
                      >

                        <Popup>

                          <div className="risk-popup">

                            <span className="popup-label">
                              MONITORING ZONE
                            </span>

                            <h3>
                              {location.location_name ||
                                location.name}
                            </h3>

                            <p>
                              {location.state}
                            </p>

                            <div
                              className="popup-risk"
                              style={{
                                color
                              }}
                            >
                              {level}
                            </div>

                            {prediction && (
                              <div className="popup-score">
                                Risk Score:{" "}
                                <strong>
                                  {
                                    prediction.risk_score
                                  }
                                  /100
                                </strong>
                              </div>
                            )}

                          </div>

                        </Popup>

                      </Marker>

                    </React.Fragment>

                  );

                }
              )}

            </MapContainer>

            {/* MAP LEGEND */}

            <div className="intelligence-legend">

              <strong>
                Risk Classification
              </strong>

              <div>
                <i
                  style={{
                    background:
                      "#16a34a"
                  }}
                ></i>
                Normal
              </div>

              <div>
                <i
                  style={{
                    background:
                      "#eab308"
                  }}
                ></i>
                Watch
              </div>

              <div>
                <i
                  style={{
                    background:
                      "#f97316"
                  }}
                ></i>
                Warning
              </div>

              <div>
                <i
                  style={{
                    background:
                      "#dc2626"
                  }}
                ></i>
                Critical
              </div>

            </div>

          </div>

        </div>

        {/* LOCATION DETAILS */}

        <div className="panel location-intelligence">

          <div className="panel-heading">

            <div>

              <span className="section-label">
                LOCATION ANALYSIS
              </span>

              <h3>
                {selectedLocation
                  ? "Selected Zone"
                  : "Select a Zone"}
              </h3>

            </div>

          </div>

          {selectedLocation ? (

            <div className="selected-location">

              <div className="selected-location-title">

                <div>

                  <h4>
                    {selectedLocation.location_name ||
                      selectedLocation.name}
                  </h4>

                  <p>
                    {selectedLocation.state}
                  </p>

                </div>

                <span
                  className={`risk-pill ${
                    selected?.risk_level
                      ?.toLowerCase() ||
                    "normal"
                  }`}
                >
                  {selected?.risk_level ||
                    "Normal"}
                </span>

              </div>

              {/* SCORE */}

              <div className="location-score">

                <div>

                  <span>
                    RISK SCORE
                  </span>

                  <strong>
                    {selected?.risk_score ??
                      "--"}
                  </strong>

                  <small>
                    /100
                  </small>

                </div>

                <div className="mini-risk-bar">

                  <span
                    style={{
                      width: `${
                        selected?.risk_score ||
                        0
                      }%`,
                      background:
                        getRiskColor(
                          selected?.risk_level
                        )
                    }}
                  ></span>

                </div>

              </div>

              {/* ENVIRONMENT */}

              <div className="detail-section">

                <span className="detail-title">
                  ENVIRONMENTAL CONDITIONS
                </span>

                <div className="detail-grid">

                  <div>
                    <span>
                      Rainfall
                    </span>

                    <strong>
                      {selected?.rainfall ??
                        selectedLocation.rainfall ??
                        "--"} mm
                    </strong>
                  </div>

                  <div>
                    <span>
                      Soil Moisture
                    </span>

                    <strong>
                      {selectedLocation.soil_moisture ??
                        "--"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Pore Pressure
                    </span>

                    <strong>
                      {selectedLocation.pore_pressure ??
                        "--"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Ground Tilt
                    </span>

                    <strong>
                      {selectedLocation.tilt ??
                        "--"}°
                    </strong>
                  </div>

                </div>

              </div>

              {/* AI */}

              <div className="detail-section">

                <span className="detail-title">
                  AI + PHYSICS
                </span>

                <div className="detail-grid">

                  <div>
                    <span>
                      Factor of Safety
                    </span>

                    <strong>
                      {selected?.factor_of_safety ??
                        "--"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      ML Probability
                    </span>

                    <strong>
                      {selected
                        ? `${(
                            Number(
                              selected.ml_probability
                            ) * 100
                          ).toFixed(1)}%`
                        : "--"}
                    </strong>
                  </div>

                </div>

              </div>

              {/* INTERPRETATION */}

              <div
                className="risk-interpretation"
                style={{
                  borderLeftColor:
                    getRiskColor(
                      selected?.risk_level
                    )
                }}
              >

                <strong>
                  Risk Interpretation
                </strong>

                <p>

                  {selected?.risk_level ===
                    "Critical" &&
                    "Multiple indicators show elevated instability conditions. Immediate review of the monitored zone is recommended."}

                  {selected?.risk_level ===
                    "Warning" &&
                    "Environmental and stability indicators show elevated risk. Continued monitoring and preparedness are recommended."}

                  {selected?.risk_level ===
                    "Watch" &&
                    "Conditions show increased sensitivity. Continue monitoring environmental changes."}

                  {(!selected ||
                    selected?.risk_level ===
                      "Normal") &&
                    "Current indicators do not show elevated prototype risk. Continue routine monitoring."}

                </p>

              </div>

            </div>

          ) : (

            <div className="select-location-message">

              <div>
                ◉
              </div>

              <h4>
                Select a location
              </h4>

              <p>
                Click any monitoring marker on
                the map to inspect its risk profile.
              </p>

            </div>

          )}

        </div>

      </section>

    </div>
  );
}

export default RiskIntelligence;