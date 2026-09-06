import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import L from "leaflet";

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup
} from "react-leaflet";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from "recharts";

import "leaflet/dist/leaflet.css";
import "./App.css";

/* =========================================================
   GEO DRISHTI - NER
   Final Prototype Frontend
   ========================================================= */

const API = "http://localhost:5000";

/* =========================================================
   LEAFLET ICON FIX
   ========================================================= */

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",

  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",

  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png"
});

/* =========================================================
   HELPERS
   ========================================================= */

const getRiskColor = (riskLevel) => {
  switch (riskLevel) {
    case "Critical":
      return "#dc2626";

    case "Warning":
      return "#f59e0b";

    case "Watch":
      return "#eab308";

    case "Normal":
      return "#16a34a";

    default:
      return "#64748b";
  }
};

const getSensorStatus = (sensor) => {
  const rainfall = Number(sensor?.rainfall || 0);
  const moisture = Number(sensor?.soil_moisture || 0);
  const porePressure = Number(sensor?.pore_pressure || 0);
  const tilt = Number(sensor?.tilt || 0);

  if (
    rainfall >= 150 ||
    moisture >= 85 ||
    porePressure >= 75 ||
    tilt >= 5
  ) {
    return "Critical";
  }

  if (
    rainfall >= 100 ||
    moisture >= 70 ||
    porePressure >= 50 ||
    tilt >= 3
  ) {
    return "Warning";
  }

  if (
    rainfall >= 50 ||
    moisture >= 50 ||
    porePressure >= 30 ||
    tilt >= 1
  ) {
    return "Watch";
  }

  return "Normal";
};

const formatDate = (date) => {
  if (!date) return "—";

  return new Date(date).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

const formatShortDate = (date) => {
  if (!date) return "";

  return new Date(date).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit"
  });
};

const createRiskIcon = (riskLevel) => {
  const color = getRiskColor(riskLevel);

  return L.divIcon({
    className: "risk-marker-wrapper",

    html: `
      <div
        class="risk-marker"
        style="
          background:${color};
          box-shadow:0 0 0 7px ${color}33;
        "
      ></div>
    `,

    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });
};

/* =========================================================
   MAIN APP
   ========================================================= */

function App() {
  /* =======================================================
     STATE
     ======================================================= */

  const [dashboard, setDashboard] = useState(null);

  const [locations, setLocations] = useState([]);

  const [predictions, setPredictions] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [activePage, setActivePage] = useState("dashboard");

  const [autoMonitoring, setAutoMonitoring] = useState(true);

  const [sensorFilter, setSensorFilter] = useState("all");

  const [selectedSensor, setSelectedSensor] = useState(null);

  const [lastPrediction, setLastPrediction] = useState(null);

  /* SMS DEMO STATE */
  const [smsHistory, setSmsHistory] = useState([]);

  const [smsSendingId, setSmsSendingId] = useState(null);

  const [toast, setToast] = useState(null);

  /* =======================================================
     TOAST
     ======================================================= */

  const showToast = (message, type = "success") => {
    setToast({
      message,
      type
    });

    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  /* =======================================================
     FETCH ALL DATA
     ======================================================= */

  const fetchDashboard = async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      }

      setError("");

      const [
        dashboardResponse,
        locationsResponse,
        predictionsResponse
      ] = await Promise.all([
        axios.get(`${API}/api/dashboard`),

        axios.get(`${API}/api/locations`),

        axios.get(`${API}/api/predictions`)
      ]);

      setDashboard(dashboardResponse.data);

      const locationData =
        dashboardResponse.data?.locations ||
        locationsResponse.data?.locations ||
        locationsResponse.data ||
        [];

      const predictionData =
        dashboardResponse.data?.predictions ||
        predictionsResponse.data?.predictions ||
        predictionsResponse.data ||
        [];

      setLocations(locationData);

      setPredictions(predictionData);

      if (predictionData.length > 0) {
        setLastPrediction(predictionData[0]);
      }
    } catch (err) {
      console.error("Dashboard API error:", err);

      setError(
        err.response?.data?.message ||
          "Unable to connect to GeoDrishti backend."
      );
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  };

  /* =======================================================
     RUN RISK PREDICTION
     ======================================================= */

  const runRiskPrediction = async () => {
    try {
      setLoading(true);

      setError("");

      const response = await axios.post(
        `${API}/api/predict-risk`
      );

      const result =
        response.data?.risk ||
        response.data?.prediction ||
        response.data;

      if (result) {
        setLastPrediction(
          result.prediction || result
        );
      }

      await fetchDashboard(false);

      const riskLevel =
        result?.prediction?.risk_level ||
        result?.risk_level ||
        "";

      if (riskLevel === "Critical") {
        showToast(
          "Critical risk detected. Alert generated.",
          "danger"
        );
      } else if (riskLevel === "Warning") {
        showToast(
          "Warning risk detected.",
          "warning"
        );
      } else {
        showToast(
          "Risk prediction completed successfully.",
          "success"
        );
      }
    } catch (err) {
      console.error("Risk prediction error:", err);

      setError(
        err.response?.data?.message ||
          "Unable to generate risk prediction."
      );

      showToast(
        "Risk prediction failed.",
        "danger"
      );
    } finally {
      setLoading(false);
    }
  };

  /* =======================================================
     INITIAL LOAD
     ======================================================= */

  useEffect(() => {
    fetchDashboard();
  }, []);

  /* =======================================================
     AUTOMATIC MONITORING
     ======================================================= */

  useEffect(() => {
    if (!autoMonitoring) {
      return;
    }

    const interval = setInterval(() => {
      runRiskPrediction();
    }, 30000);

    return () => {
      clearInterval(interval);
    };
  }, [autoMonitoring]);

  /* =======================================================
     DATA
     ======================================================= */

  const sensorData =
    dashboard?.latest_sensors || [];

  const recentAlerts =
    dashboard?.recent_alerts || [];

  const latestPredictions =
    dashboard?.latest_predictions || predictions || [];

  /* =======================================================
     FILTERED SENSOR DATA
     ======================================================= */

  const filteredSensors = useMemo(() => {
    if (sensorFilter === "all") {
      return sensorData;
    }

    return sensorData.filter(
      (sensor) =>
        getSensorStatus(sensor) === sensorFilter
    );
  }, [sensorData, sensorFilter]);

  /* =======================================================
     SENSOR STATISTICS
     ======================================================= */

  const sensorStats = useMemo(() => {
    return {
      total: sensorData.length,

      normal: sensorData.filter(
        (sensor) =>
          getSensorStatus(sensor) === "Normal"
      ).length,

      watch: sensorData.filter(
        (sensor) =>
          getSensorStatus(sensor) === "Watch"
      ).length,

      warning: sensorData.filter(
        (sensor) =>
          getSensorStatus(sensor) === "Warning"
      ).length,

      critical: sensorData.filter(
        (sensor) =>
          getSensorStatus(sensor) === "Critical"
      ).length
    };
  }, [sensorData]);

  /* =======================================================
     SMS DEMO
     ======================================================= */

  const sendDemoSMS = async (alert) => {
    if (!alert) {
      return;
    }

    if (alert.risk_level !== "Critical") {
      showToast(
        "Demo SMS is enabled for Critical alerts only.",
        "warning"
      );

      return;
    }

    setSmsSendingId(alert.id);

    try {
      await new Promise((resolve) =>
        setTimeout(resolve, 1200)
      );

      const smsMessage =
        `GeoDrishti-NER ALERT: Critical landslide risk detected at ${alert.location_name || "monitored location"}. ${alert.message || "Immediate attention recommended."}`;

      const smsRecord = {
        id: Date.now(),

        alert_id: alert.id,

        location_name:
          alert.location_name ||
          "Unknown Location",

        state: alert.state || "NER",

        risk_level: alert.risk_level,

        message: smsMessage,

        recipient: "Demo District Control Room",

        status: "SENT",

        sent_at: new Date().toISOString()
      };

      setSmsHistory((previous) => [
        smsRecord,
        ...previous
      ]);

      showToast(
        "Demo SMS sent successfully.",
        "success"
      );
    } catch (err) {
      console.error("Demo SMS error:", err);

      showToast(
        "Unable to send demo SMS.",
        "danger"
      );
    } finally {
      setSmsSendingId(null);
    }
  };

  /* =======================================================
     PAGE NAVIGATION
     ======================================================= */

  const navigationItems = [
    {
      id: "dashboard",
      icon: "⌂",
      label: "Command Center"
    },

    {
      id: "risk",
      icon: "◉",
      label: "Risk Intelligence"
    },

    {
      id: "sensors",
      icon: "⌁",
      label: "Sensor Network"
    },

    {
      id: "alerts",
      icon: "⚠",
      label: "Alert Center"
    },

    {
      id: "sms",
      icon: "✉",
      label: "SMS Notifications"
    },

    {
      id: "analytics",
      icon: "◈",
      label: "Analytics"
    },

    {
      id: "locations",
      icon: "⌖",
      label: "Locations"
    }
  ];

  const pageInfo = {
    dashboard: {
      title: "Landslide Risk Dashboard",

      subtitle:
        "AI-powered early warning and risk monitoring system"
    },

    risk: {
      title: "Risk Intelligence",

      subtitle:
        "Hybrid physics and AI landslide risk analysis"
    },

    sensors: {
      title: "Sensor Network",

      subtitle:
        "Environmental and slope monitoring network"
    },

    alerts: {
      title: "Alert Center",

      subtitle:
        "Active landslide warnings and risk notifications"
    },

    sms: {
      title: "SMS Notifications",

      subtitle:
        "Emergency notification simulation for critical alerts"
    },

    analytics: {
      title: "Analytics",

      subtitle:
        "Environmental and landslide risk trends"
    },

    locations: {
      title: "Monitoring Locations",

      subtitle:
        "Landslide monitoring zones across NER"
    }
  };

  const currentPage =
    pageInfo[activePage] ||
    pageInfo.dashboard;

  /* =======================================================
     LATEST PREDICTION BY LOCATION
     ======================================================= */

  const getLocationPrediction = (locationId) => {
    const matches = predictions.filter(
      (prediction) =>
        Number(prediction.location_id) ===
        Number(locationId)
    );

    return matches.length > 0
      ? matches[0]
      : null;
  };

  /* =======================================================
     DASHBOARD
     ======================================================= */

  const renderDashboard = () => {
    return (
      <>
        <section className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">⌖</div>

            <div>
              <span>Total Locations</span>

              <strong>
                {dashboard?.summary
                  ?.total_locations ?? 0}
              </strong>

              <small>
                NER monitored zones
              </small>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">⌁</div>

            <div>
              <span>Sensor Readings</span>

              <strong>
                {dashboard?.summary
                  ?.total_sensor_readings ?? 0}
              </strong>

              <small>
                Environmental observations
              </small>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">◈</div>

            <div>
              <span>Predictions</span>

              <strong>
                {dashboard?.summary
                  ?.total_predictions ?? 0}
              </strong>

              <small>
                AI risk predictions
              </small>
            </div>
          </div>

          <div className="stat-card alert-stat">
            <div className="stat-icon">⚠</div>

            <div>
              <span>Active Alerts</span>

              <strong>
                {dashboard?.summary
                  ?.active_alerts ?? 0}
              </strong>

              <small>
                Requires monitoring
              </small>
            </div>
          </div>
        </section>

        <section className="dashboard-grid">
          <div className="panel map-panel">
            <div className="panel-header">
              <div>
                <h2>NER Risk Map</h2>

                <p>
                  Current monitoring locations
                </p>
              </div>

              <button
                className="outline-button"
                onClick={() =>
                  fetchDashboard()
                }
                disabled={loading}
              >
                {loading
                  ? "Refreshing..."
                  : "Refresh"}
              </button>
            </div>

            <div className="real-map">
              <MapContainer
                center={[25.8, 91.8]}
                zoom={6}
                scrollWheelZoom={true}
                style={{
                  height: "100%",
                  width: "100%"
                }}
              >
                <TileLayer
                  attribution="&copy; OpenStreetMap contributors"
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {locations.map((location) => {
                  const prediction =
                    getLocationPrediction(
                      location.id
                    );

                  const riskLevel =
                    prediction?.risk_level ||
                    "Normal";

                  const riskScore =
                    Number(
                      prediction?.risk_score || 0
                    );

                  return (
                    <Marker
                      key={location.id}
                      position={[
                        Number(location.latitude),
                        Number(location.longitude)
                      ]}
                      icon={createRiskIcon(
                        riskLevel
                      )}
                    >
                      <Popup>
                        <div className="map-popup">
                          <h3>
                            {location.name}
                          </h3>

                          <p>
                            <b>State:</b>{" "}
                            {location.state}
                          </p>

                          <p>
                            <b>Risk:</b>{" "}
                            <span
                              style={{
                                color:
                                  getRiskColor(
                                    riskLevel
                                  ),
                                fontWeight: 800
                              }}
                            >
                              {riskLevel}
                            </span>
                          </p>

                          <p>
                            <b>Risk Score:</b>{" "}
                            {riskScore.toFixed(1)}
                            /100
                          </p>

                          {prediction && (
                            <>
                              <p>
                                <b>FS:</b>{" "}
                                {Number(
                                  prediction.factor_of_safety ||
                                    0
                                ).toFixed(3)}
                              </p>

                              <p>
                                <b>ML Probability:</b>{" "}
                                {(
                                  Number(
                                    prediction.ml_probability ||
                                      0
                                  ) * 100
                                ).toFixed(0)}
                                %
                              </p>

                              <p>
                                <b>Rainfall:</b>{" "}
                                {Number(
                                  prediction.rainfall ||
                                    0
                                ).toFixed(1)}
                                mm
                              </p>
                            </>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>

              <div className="map-legend">
                <b>Risk Level</b>

                <div>
                  <span
                    className="legend-dot"
                    style={{
                      background:
                        "#16a34a"
                    }}
                  />

                  Normal
                </div>

                <div>
                  <span
                    className="legend-dot"
                    style={{
                      background:
                        "#eab308"
                    }}
                  />

                  Watch
                </div>

                <div>
                  <span
                    className="legend-dot"
                    style={{
                      background:
                        "#f59e0b"
                    }}
                  />

                  Warning
                </div>

                <div>
                  <span
                    className="legend-dot"
                    style={{
                      background:
                        "#dc2626"
                    }}
                  />

                  Critical
                </div>
              </div>
            </div>
          </div>

          <div className="panel risk-panel">
            <div className="panel-header">
              <div>
                <h2>Current Risk</h2>

                <p>
                  Latest hybrid risk prediction
                </p>
              </div>

              <button
                className="risk-button"
                onClick={
                  runRiskPrediction
                }
                disabled={loading}
              >
                {loading
                  ? "Analyzing..."
                  : "Run Prediction"}
              </button>
            </div>

            <div className="monitoring-control">
              <div>
                <strong>
                  Automatic Monitoring
                </strong>

                <small>
                  Prediction interval: 30 seconds
                </small>
              </div>

              <button
                className={`toggle ${
                  autoMonitoring
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setAutoMonitoring(
                    !autoMonitoring
                  )
                }
              >
                <span />
              </button>
            </div>

            {latestPredictions.length > 0 ? (
              (() => {
                const prediction =
                  latestPredictions[0];

                const riskLevel =
                  prediction.risk_level ||
                  "Normal";

                const score =
                  Number(
                    prediction.risk_score || 0
                  );

                return (
                  <div className="risk-main">
                    <div
                      className="risk-circle"
                      style={{
                        borderColor:
                          getRiskColor(
                            riskLevel
                          )
                      }}
                    >
                      <strong>
                        {score.toFixed(0)}
                      </strong>

                      <span>/100</span>
                    </div>

                    <div
                      className="risk-level"
                      style={{
                        color:
                          getRiskColor(
                            riskLevel
                          )
                      }}
                    >
                      {riskLevel}
                    </div>

                    <p className="risk-location">
                      {prediction.location_name ||
                        "Latest monitored location"}
                    </p>

                    <div className="risk-metrics">
                      <div>
                        <span>
                          Factor of Safety
                        </span>

                        <strong>
                          {Number(
                            prediction.factor_of_safety ||
                              0
                          ).toFixed(3)}
                        </strong>
                      </div>

                      <div>
                        <span>
                          ML Probability
                        </span>

                        <strong>
                          {(
                            Number(
                              prediction.ml_probability ||
                                0
                            ) * 100
                          ).toFixed(0)}
                          %
                        </strong>
                      </div>

                      <div>
                        <span>
                          Rainfall
                        </span>

                        <strong>
                          {Number(
                            prediction.rainfall ||
                              0
                          ).toFixed(1)}
                          mm
                        </strong>
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="empty-state">
                <div>◈</div>

                <h3>
                  No prediction available
                </h3>

                <p>
                  Run a risk prediction to
                  analyze the latest sensor
                  reading.
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="content-grid">
          <div className="panel">
            <div className="panel-header">
              <div>
                <h2>Latest Sensor Data</h2>

                <p>
                  Most recent environmental
                  observations
                </p>
              </div>

              <button
                className="text-button"
                onClick={() =>
                  setActivePage("sensors")
                }
              >
                View All
              </button>
            </div>

            <SensorTable
              sensors={sensorData.slice(0, 6)}
              onSelect={setSelectedSensor}
            />
          </div>

          <div className="panel">
            <div className="panel-header">
              <div>
                <h2>Recent Alerts</h2>

                <p>
                  Latest generated warnings
                </p>
              </div>

              <button
                className="text-button"
                onClick={() =>
                  setActivePage("alerts")
                }
              >
                Alert Center
              </button>
            </div>

            <AlertList
              alerts={recentAlerts.slice(0, 5)}
              onSendSMS={sendDemoSMS}
              smsSendingId={smsSendingId}
            />
          </div>
        </section>
      </>
    );
  };

  /* =======================================================
     RISK INTELLIGENCE
     ======================================================= */

  const renderRiskIntelligence = () => {
    const latest =
      latestPredictions[0];

    if (!latest) {
      return (
        <EmptyPage
          icon="◉"
          title="No risk prediction available"
          message="Run the risk engine from the Command Center first."
          buttonText="Go to Command Center"
          onClick={() =>
            setActivePage("dashboard")
          }
        />
      );
    }

    const score =
      Number(latest.risk_score || 0);

    const fs =
      Number(
        latest.factor_of_safety || 0
      );

    const probability =
      Number(
        latest.ml_probability || 0
      ) * 100;

    const rainfall =
      Number(
        latest.rainfall || 0
      );

    return (
      <>
        <section className="intelligence-grid">
          <div className="panel intelligence-main">
            <div className="section-label">
              HYBRID RISK ENGINE
            </div>

            <h2>
              {latest.location_name ||
                "Latest Monitoring Zone"}
            </h2>

            <p className="muted">
              Physics-informed + AI-based
              landslide risk assessment.
            </p>

            <div className="big-risk-score">
              <div
                className="score-number"
                style={{
                  color:
                    getRiskColor(
                      latest.risk_level
                    )
                }}
              >
                {score.toFixed(0)}
              </div>

              <div className="score-total">
                /100
              </div>
            </div>

            <div
              className="large-risk-badge"
              style={{
                background:
                  `${getRiskColor(
                    latest.risk_level
                  )}18`,
                color:
                  getRiskColor(
                    latest.risk_level
                  )
              }}
            >
              {latest.risk_level}
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <div>
                <h2>Risk Components</h2>

                <p>
                  Inputs used by the prototype
                  hybrid engine
                </p>
              </div>
            </div>

            <MetricRow
              label="Factor of Safety"
              value={fs.toFixed(3)}
              description="Physics stability indicator"
            />

            <MetricRow
              label="ML Probability"
              value={`${probability.toFixed(0)}%`}
              description="Prototype AI probability"
            />

            <MetricRow
              label="Rainfall"
              value={`${rainfall.toFixed(1)} mm`}
              description="Current rainfall input"
            />

            <MetricRow
              label="Risk Score"
              value={`${score.toFixed(1)}/100`}
              description="Combined prototype score"
            />
          </div>
        </section>

        <section className="panel methodology-panel">
          <div className="panel-header">
            <div>
              <h2>Risk Methodology</h2>

              <p>
                GeoDrishti-NER hybrid screening
                architecture
              </p>
            </div>
          </div>

          <div className="methodology-flow">
            <MethodStep
              number="01"
              title="Environmental Data"
              text="Rainfall, soil moisture, pore pressure and tilt."
            />

            <div className="flow-arrow">→</div>

            <MethodStep
              number="02"
              title="Physics Engine"
              text="Factor of Safety using effective stress."
            />

            <div className="flow-arrow">→</div>

            <MethodStep
              number="03"
              title="AI Engine"
              text="Prototype ML probability estimation."
            />

            <div className="flow-arrow">→</div>

            <MethodStep
              number="04"
              title="Hybrid Risk"
              text="Combined score from 0 to 100."
            />

            <div className="flow-arrow">→</div>

            <MethodStep
              number="05"
              title="Early Warning"
              text="Normal, Watch, Warning or Critical."
            />
          </div>

          <div className="formula-box">
            <strong>
              Factor of Safety
            </strong>

            <span>
              FS = [c′ + (σₙ − u) tan φ′] / τ
            </span>

            <p>
              Prototype screening indicator:
              lower FS indicates lower slope
              stability under the modeled
              conditions.
            </p>
          </div>

          <div className="prototype-note">
            Prototype thresholds and model
            probabilities require calibration,
            field validation and geotechnical
            assessment before operational use.
          </div>
        </section>
      </>
    );
  };

  /* =======================================================
     SENSORS
     ======================================================= */

  const renderSensors = () => {
    return (
      <>
        <section className="sensor-summary-grid">
          <SensorSummary
            title="Total"
            value={sensorStats.total}
            type="all"
          />

          <SensorSummary
            title="Normal"
            value={sensorStats.normal}
            type="Normal"
          />

          <SensorSummary
            title="Watch"
            value={sensorStats.watch}
            type="Watch"
          />

          <SensorSummary
            title="Warning"
            value={sensorStats.warning}
            type="Warning"
          />

          <SensorSummary
            title="Critical"
            value={sensorStats.critical}
            type="Critical"
          />
        </section>

        <section className="panel">
          <div className="panel-header sensor-header">
            <div>
              <h2>
                Environmental Sensor Network
              </h2>

              <p>
                Simulated prototype monitoring
                readings
              </p>
            </div>

            <select
              value={sensorFilter}
              onChange={(event) =>
                setSensorFilter(
                  event.target.value
                )
              }
              className="filter-select"
            >
              <option value="all">
                All Sensors
              </option>

              <option value="Normal">
                Normal
              </option>

              <option value="Watch">
                Watch
              </option>

              <option value="Warning">
                Warning
              </option>

              <option value="Critical">
                Critical
              </option>
            </select>
          </div>

          <SensorTable
            sensors={filteredSensors}
            onSelect={setSelectedSensor}
            detailed
          />
        </section>
      </>
    );
  };

  /* =======================================================
     ALERT CENTER
     ======================================================= */

  const renderAlerts = () => {
    const criticalCount =
      recentAlerts.filter(
        (alert) =>
          alert.risk_level === "Critical"
      ).length;

    const warningCount =
      recentAlerts.filter(
        (alert) =>
          alert.risk_level === "Warning"
      ).length;

    return (
      <>
        <section className="alert-summary-grid">
          <div className="alert-summary critical">
            <span>Critical</span>

            <strong>
              {criticalCount}
            </strong>

            <small>
              Highest-priority alerts
            </small>
          </div>

          <div className="alert-summary warning">
            <span>Warning</span>

            <strong>
              {warningCount}
            </strong>

            <small>
              Elevated monitoring
            </small>
          </div>

          <div className="alert-summary active">
            <span>Active Alerts</span>

            <strong>
              {dashboard?.summary
                ?.active_alerts ?? 0}
            </strong>

            <small>
              Current alert records
            </small>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Alert Center</h2>

              <p>
                Risk alerts generated by the
                monitoring engine
              </p>
            </div>

            <button
              className="outline-button"
              onClick={() =>
                fetchDashboard()
              }
            >
              Refresh Alerts
            </button>
          </div>

          {recentAlerts.length === 0 ? (
            <EmptyPage
              inline
              icon="✓"
              title="No alerts"
              message="No warning or critical alerts have been generated."
            />
          ) : (
            <div className="alert-table">
              {recentAlerts.map((alert) => (
                <div
                  className="alert-row"
                  key={alert.id}
                >
                  <div
                    className="alert-level-icon"
                    style={{
                      background:
                        `${getRiskColor(
                          alert.risk_level
                        )}18`,
                      color:
                        getRiskColor(
                          alert.risk_level
                        )
                    }}
                  >
                    ⚠
                  </div>

                  <div className="alert-content">
                    <div className="alert-title-row">
                      <h3>
                        {alert.location_name ||
                          "Monitoring Location"}
                      </h3>

                      <span
                        className="status-badge"
                        style={{
                          color:
                            getRiskColor(
                              alert.risk_level
                            ),
                          background:
                            `${getRiskColor(
                              alert.risk_level
                            )}15`
                        }}
                      >
                        {alert.risk_level}
                      </span>
                    </div>

                    <p>
                      {alert.message ||
                        "Risk condition detected."}
                    </p>

                    <small>
                      {alert.state || "NER"} •{" "}
                      {formatDate(
                        alert.created_at
                      )}
                    </small>
                  </div>

                  <div className="alert-actions">
                    {alert.risk_level ===
                    "Critical" ? (
                      <button
                        className="sms-button"
                        onClick={() =>
                          sendDemoSMS(alert)
                        }
                        disabled={
                          smsSendingId ===
                          alert.id
                        }
                      >
                        {smsSendingId ===
                        alert.id
                          ? "Sending..."
                          : "✉ Send Demo SMS"}
                      </button>
                    ) : (
                      <span className="sms-disabled">
                        SMS: Critical only
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </>
    );
  };

  /* =======================================================
     SMS PAGE
     ======================================================= */

  const renderSMS = () => {
    return (
      <>
        <section className="sms-hero">
          <div className="sms-hero-icon">
            ✉
          </div>

          <div>
            <span className="section-label">
              NOTIFICATION SYSTEM
            </span>

            <h2>
              Emergency SMS Notification
            </h2>

            <p>
              Prototype simulation of the
              critical-risk notification workflow.
            </p>
          </div>

          <div className="sms-status">
            <span className="status-dot" />

            DEMO MODE
          </div>
        </section>

        <section className="sms-flow panel">
          <div className="panel-header">
            <div>
              <h2>
                Notification Workflow
              </h2>

              <p>
                How GeoDrishti handles a critical
                risk event
              </p>
            </div>
          </div>

          <div className="notification-flow">
            <FlowCard
              number="01"
              title="Critical Risk"
              text="Hybrid risk engine classifies the location as Critical."
            />

            <span className="flow-arrow">
              →
            </span>

            <FlowCard
              number="02"
              title="Alert Created"
              text="Node.js backend stores the risk alert in MySQL."
            />

            <span className="flow-arrow">
              →
            </span>

            <FlowCard
              number="03"
              title="SMS Trigger"
              text="The notification module prepares an emergency SMS."
            />

            <span className="flow-arrow">
              →
            </span>

            <FlowCard
              number="04"
              title="SMS Sent"
              text="Prototype displays the notification as successfully sent."
            />
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>
                SMS Notification History
              </h2>

              <p>
                Demo messages generated during
                this browser session
              </p>
            </div>

            <span className="demo-label">
              DEMO
            </span>
          </div>

          {smsHistory.length === 0 ? (
            <div className="empty-state sms-empty">
              <div>✉</div>

              <h3>
                No SMS notifications yet
              </h3>

              <p>
                Go to Alert Center and use
                "Send Demo SMS" on a Critical
                alert.
              </p>

              <button
                className="risk-button"
                onClick={() =>
                  setActivePage("alerts")
                }
              >
                Open Alert Center
              </button>
            </div>
          ) : (
            <div className="sms-history">
              {smsHistory.map((sms) => (
                <div
                  className="sms-history-row"
                  key={sms.id}
                >
                  <div className="sms-check">
                    ✓
                  </div>

                  <div>
                    <strong>
                      {sms.location_name}
                    </strong>

                    <p>
                      {sms.message}
                    </p>

                    <small>
                      {sms.recipient} •{" "}
                      {formatDate(
                        sms.sent_at
                      )}
                    </small>
                  </div>

                  <span className="sent-badge">
                    SMS SENT
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="demo-warning">
            <strong>
              Prototype notice:
            </strong>{" "}
            This is a simulated SMS workflow.
            It does not send a real mobile SMS.
            A production deployment can connect
            this step to an approved SMS gateway
            after proper credentials, consent and
            operational validation are configured.
          </div>
        </section>
      </>
    );
  };

  /* =======================================================
     ANALYTICS
     ======================================================= */

  const renderAnalytics = () => {
    const chartData = [...latestPredictions]
      .slice(0, 10)
      .reverse()
      .map((prediction, index) => ({
        name:
          formatShortDate(
            prediction.prediction_time
          ) || `P${index + 1}`,

        risk: Number(
          prediction.risk_score || 0
        ),

        rainfall: Number(
          prediction.rainfall || 0
        )
      }));

    return (
      <>
        <section className="analytics-grid">
          <div className="panel">
            <div className="panel-header">
              <div>
                <h2>
                  Risk Score Trend
                </h2>

                <p>
                  Recent prediction history
                </p>
              </div>
            </div>

            <div className="chart-container">
              {chartData.length > 0 ? (
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <LineChart
                    data={chartData}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                    />

                    <XAxis dataKey="name" />

                    <YAxis
                      domain={[0, 100]}
                    />

                    <Tooltip />

                    <Line
                      type="monotone"
                      dataKey="risk"
                      stroke="#2563eb"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="chart-empty">
                  No prediction history
                </div>
              )}
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <div>
                <h2>
                  Risk Distribution
                </h2>

                <p>
                  Current sensor status
                </p>
              </div>
            </div>

            <RiskDistribution
              normal={sensorStats.normal}
              watch={sensorStats.watch}
              warning={sensorStats.warning}
              critical={sensorStats.critical}
            />
          </div>
        </section>

        <section className="analytics-cards">
          <AnalyticsCard
            title="Critical Alerts"
            value={
              dashboard?.summary
                ?.critical_alerts ?? 0
            }
            description="Highest-priority risk records"
          />

          <AnalyticsCard
            title="Warning Alerts"
            value={
              dashboard?.summary
                ?.warning_alerts ?? 0
            }
            description="Elevated-risk records"
          />

          <AnalyticsCard
            title="Predictions"
            value={
              dashboard?.summary
                ?.total_predictions ?? 0
            }
            description="Risk engine executions"
          />

          <AnalyticsCard
            title="Sensor Readings"
            value={
              dashboard?.summary
                ?.total_sensor_readings ?? 0
            }
            description="Environmental observations"
          />
        </section>
      </>
    );
  };

  /* =======================================================
     LOCATIONS
     ======================================================= */

  const renderLocations = () => {
    return (
      <section className="location-grid">
        {locations.length === 0 ? (
          <EmptyPage
            icon="⌖"
            title="No locations found"
            message="Add monitoring locations to MySQL first."
          />
        ) : (
          locations.map((location) => {
            const prediction =
              getLocationPrediction(
                location.id
              );

            const riskLevel =
              prediction?.risk_level ||
              "Normal";

            const score =
              Number(
                prediction?.risk_score || 0
              );

            return (
              <div
                className="location-card"
                key={location.id}
              >
                <div className="location-top">
                  <div className="location-icon">
                    ⌖
                  </div>

                  <span
                    className="status-badge"
                    style={{
                      color:
                        getRiskColor(
                          riskLevel
                        ),
                      background:
                        `${getRiskColor(
                          riskLevel
                        )}15`
                    }}
                  >
                    {riskLevel}
                  </span>
                </div>

                <h2>
                  {location.name}
                </h2>

                <p className="location-state">
                  {location.state}
                </p>

                <div className="location-details">
                  <div>
                    <span>
                      Latitude
                    </span>

                    <strong>
                      {location.latitude}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Longitude
                    </span>

                    <strong>
                      {location.longitude}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Elevation
                    </span>

                    <strong>
                      {location.elevation ??
                        "—"} m
                    </strong>
                  </div>

                  <div>
                    <span>
                      Slope
                    </span>

                    <strong>
                      {location.slope_angle ??
                        "—"}°
                    </strong>
                  </div>

                  <div>
                    <span>
                      Soil
                    </span>

                    <strong>
                      {location.soil_type ||
                        "—"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Risk Score
                    </span>

                    <strong
                      style={{
                        color:
                          getRiskColor(
                            riskLevel
                          )
                      }}
                    >
                      {score.toFixed(1)}
                    </strong>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </section>
    );
  };

  /* =======================================================
     PAGE CONTENT
     ======================================================= */

  const renderPage = () => {
    switch (activePage) {
      case "dashboard":
        return renderDashboard();

      case "risk":
        return renderRiskIntelligence();

      case "sensors":
        return renderSensors();

      case "alerts":
        return renderAlerts();

      case "sms":
        return renderSMS();

      case "analytics":
        return renderAnalytics();

      case "locations":
        return renderLocations();

      default:
        return renderDashboard();
    }
  };

  /* =======================================================
     LOADING
     ======================================================= */

  if (loading && !dashboard) {
    return (
      <div className="loading-screen">
        <div className="loader-logo">
          GD
        </div>

        <h2>
          Loading GeoDrishti-NER...
        </h2>

        <p>
          Connecting to monitoring backend
        </p>

        <div className="loader-line">
          <span />
        </div>
      </div>
    );
  }

  /* =======================================================
     MAIN UI
     ======================================================= */

  return (
    <div className="app-shell">
      {/* SIDEBAR */}

      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo">
            GD
          </div>

          <div>
            <strong>
              GeoDrishti
            </strong>

          </div>
        </div>

        <nav className="sidebar-nav">
          {navigationItems.map((item) => (
            <button
              key={item.id}
              className={
                activePage === item.id
                  ? "nav-item active"
                  : "nav-item"
              }
              onClick={() =>
                setActivePage(item.id)
              }
            >
              <span className="nav-icon">
                {item.icon}
              </span>

              <span>
                {item.label}
              </span>

              {item.id === "alerts" &&
                Number(
                  dashboard?.summary
                    ?.active_alerts || 0
                ) > 0 && (
                  <b className="nav-count">
                    {
                      dashboard.summary
                        .active_alerts
                    }
                  </b>
                )}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="system-status">
            <span className="status-dot" />

            <div>
              <strong>
                System Online
              </strong>

              <small>
                Backend connected
              </small>
            </div>
          </div>

        </div>
      </aside>

      {/* MAIN */}

      <main className="main-content">
        <header className="topbar">
          <div className="topbar-left-clean" aria-hidden="true" />

          <div className="topbar-actions">
            <div className="live-status">
              <span className="status-dot" />

              Live Monitoring
            </div>

            <button
              className="top-refresh"
              onClick={() =>
                fetchDashboard()
              }
              disabled={loading}
            >
              ↻
            </button>
          </div>
        </header>

        {error && (
          <div className="error-banner">
            <span>⚠</span>

            <div>
              <strong>
                Backend connection issue
              </strong>

              <p>{error}</p>
            </div>

            <button
              onClick={() =>
                fetchDashboard()
              }
            >
              Retry
            </button>
          </div>
        )}

        <div className="page-content">
          {renderPage()}
        </div>

        <footer className="footer">
          <div>
            <strong>
              GeoDrishti-NER
            </strong>

            <span>
              AI-Based Early Warning and
              Landslide Risk Monitoring System
            </span>
          </div>

          <div>
            Space Technology • SIH 2026
          </div>
        </footer>
      </main>

      {/* SENSOR MODAL */}

      {selectedSensor && (
        <div
          className="modal-backdrop"
          onClick={() =>
            setSelectedSensor(null)
          }
        >
          <div
            className="sensor-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="modal-header">
              <div>
                <span className="section-label">
                  SENSOR READING
                </span>

                <h2>
                  {selectedSensor.location_name ||
                    "Monitoring Location"}
                </h2>
              </div>

              <button
                className="close-button"
                onClick={() =>
                  setSelectedSensor(null)
                }
              >
                ×
              </button>
            </div>

            <div className="modal-risk">
              <span
                className="status-badge"
                style={{
                  color:
                    getRiskColor(
                      getSensorStatus(
                        selectedSensor
                      )
                    ),
                  background:
                    `${getRiskColor(
                      getSensorStatus(
                        selectedSensor
                      )
                    )}15`
                }}
              >
                {getSensorStatus(
                  selectedSensor
                )}
              </span>

              <small>
                {formatDate(
                  selectedSensor.reading_time
                )}
              </small>
            </div>

            <div className="sensor-detail-grid">
              <DetailMetric
                label="Rainfall"
                value={`${Number(
                  selectedSensor.rainfall || 0
                ).toFixed(1)} mm`}
              />

              <DetailMetric
                label="Soil Moisture"
                value={`${Number(
                  selectedSensor.soil_moisture ||
                    0
                ).toFixed(1)}%`}
              />

              <DetailMetric
                label="Pore Pressure"
                value={`${Number(
                  selectedSensor.pore_pressure ||
                    0
                ).toFixed(1)}`}
              />

              <DetailMetric
                label="Tilt"
                value={`${Number(
                  selectedSensor.tilt || 0
                ).toFixed(2)}°`}
              />
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}

      {toast && (
        <div
          className={`toast ${toast.type}`}
        >
          <span>
            {toast.type === "danger"
              ? "⚠"
              : toast.type ===
                "warning"
              ? "!"
              : "✓"}
          </span>

          {toast.message}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   SENSOR TABLE
   ========================================================= */

function SensorTable({
  sensors,
  onSelect,
  detailed = false
}) {
  if (!sensors || sensors.length === 0) {
    return (
      <div className="empty-table">
        <div>⌁</div>

        <strong>
          No sensor readings found
        </strong>

        <span>
          Add sensor readings to MySQL.
        </span>
      </div>
    );
  }

  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Location</th>

            <th>Rainfall</th>

            <th>Moisture</th>

            <th>Pore Pressure</th>

            <th>Tilt</th>

            <th>Status</th>

            {detailed && (
              <th>Reading Time</th>
            )}
          </tr>
        </thead>

        <tbody>
          {sensors.map((sensor) => {
            const status =
              getSensorStatus(sensor);

            return (
              <tr
                key={sensor.id}
                onClick={() =>
                  onSelect(sensor)
                }
                className="clickable-row"
              >
                <td>
                  <strong>
                    {sensor.location_name ||
                      `Location ${sensor.location_id}`}
                  </strong>

                  <small>
                    {sensor.state || "NER"}
                  </small>
                </td>

                <td>
                  {Number(
                    sensor.rainfall || 0
                  ).toFixed(1)}
                  <small> mm</small>
                </td>

                <td>
                  {Number(
                    sensor.soil_moisture || 0
                  ).toFixed(1)}
                  <small>%</small>
                </td>

                <td>
                  {Number(
                    sensor.pore_pressure || 0
                  ).toFixed(1)}
                </td>

                <td>
                  {Number(
                    sensor.tilt || 0
                  ).toFixed(2)}
                  <small>°</small>
                </td>

                <td>
                  <span
                    className="status-badge"
                    style={{
                      color:
                        getRiskColor(status),
                      background:
                        `${getRiskColor(
                          status
                        )}15`
                    }}
                  >
                    {status}
                  </span>
                </td>

                {detailed && (
                  <td>
                    {formatDate(
                      sensor.reading_time
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* =========================================================
   COMPONENTS
   ========================================================= */

function SensorSummary({
  title,
  value,
  type
}) {
  const color =
    type === "all"
      ? "#2563eb"
      : getRiskColor(type);

  return (
    <div className="sensor-summary">
      <div
        className="summary-dot"
        style={{
          background: color
        }}
      />

      <div>
        <span>{title}</span>

        <strong>{value}</strong>
      </div>
    </div>
  );
}

function AlertList({
  alerts,
  onSendSMS,
  smsSendingId
}) {
  if (!alerts || alerts.length === 0) {
    return (
      <div className="empty-alerts">
        <div>✓</div>

        <strong>
          No recent alerts
        </strong>

        <span>
          System is currently clear.
        </span>
      </div>
    );
  }

  return (
    <div className="compact-alert-list">
      {alerts.map((alert) => (
        <div
          className="compact-alert"
          key={alert.id}
        >
          <div
            className="compact-alert-icon"
            style={{
              color:
                getRiskColor(
                  alert.risk_level
                ),
              background:
                `${getRiskColor(
                  alert.risk_level
                )}15`
            }}
          >
            ⚠
          </div>

          <div>
            <strong>
              {alert.location_name ||
                "Monitoring Location"}
            </strong>

            <span>
              {alert.message ||
                `${alert.risk_level} risk detected.`}
            </span>

            <small>
              {formatDate(
                alert.created_at
              )}
            </small>
          </div>

          {alert.risk_level ===
            "Critical" && (
            <button
              className="mini-sms-button"
              onClick={() =>
                onSendSMS(alert)
              }
              disabled={
                smsSendingId ===
                alert.id
              }
            >
              {smsSendingId === alert.id
                ? "..."
                : "SMS"}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function MetricRow({
  label,
  value,
  description
}) {
  return (
    <div className="metric-row">
      <div>
        <strong>{label}</strong>

        <small>
          {description}
        </small>
      </div>

      <span>{value}</span>
    </div>
  );
}

function MethodStep({
  number,
  title,
  text
}) {
  return (
    <div className="method-step">
      <span>{number}</span>

      <strong>{title}</strong>

      <p>{text}</p>
    </div>
  );
}

function FlowCard({
  number,
  title,
  text
}) {
  return (
    <div className="flow-card">
      <span>{number}</span>

      <strong>{title}</strong>

      <p>{text}</p>
    </div>
  );
}

function DetailMetric({
  label,
  value
}) {
  return (
    <div className="detail-metric">
      <span>{label}</span>

      <strong>{value}</strong>
    </div>
  );
}

function AnalyticsCard({
  title,
  value,
  description
}) {
  return (
    <div className="analytics-card">
      <span>{title}</span>

      <strong>{value}</strong>

      <small>
        {description}
      </small>
    </div>
  );
}

function RiskDistribution({
  normal,
  watch,
  warning,
  critical
}) {
  const total =
    normal +
    watch +
    warning +
    critical;

  const getPercent = (value) => {
    if (total === 0) return 0;

    return (value / total) * 100;
  };

  return (
    <div className="distribution">
      <DistributionRow
        label="Normal"
        value={normal}
        percent={getPercent(normal)}
        color="#16a34a"
      />

      <DistributionRow
        label="Watch"
        value={watch}
        percent={getPercent(watch)}
        color="#eab308"
      />

      <DistributionRow
        label="Warning"
        value={warning}
        percent={getPercent(warning)}
        color="#f59e0b"
      />

      <DistributionRow
        label="Critical"
        value={critical}
        percent={getPercent(critical)}
        color="#dc2626"
      />
    </div>
  );
}

function DistributionRow({
  label,
  value,
  percent,
  color
}) {
  return (
    <div className="distribution-row">
      <div>
        <span>
          <i
            style={{
              background: color
            }}
          />

          {label}
        </span>

        <strong>{value}</strong>
      </div>

      <div className="distribution-bar">
        <span
          style={{
            width: `${percent}%`,
            background: color
          }}
        />
      </div>
    </div>
  );
}

function EmptyPage({
  icon,
  title,
  message,
  buttonText,
  onClick,
  inline = false
}) {
  return (
    <div
      className={
        inline
          ? "empty-state inline-empty"
          : "empty-state page-empty"
      }
    >
      <div>{icon}</div>

      <h3>{title}</h3>

      <p>{message}</p>

      {buttonText && onClick && (
        <button
          className="risk-button"
          onClick={onClick}
        >
          {buttonText}
        </button>
      )}
    </div>
  );
}

export default App;