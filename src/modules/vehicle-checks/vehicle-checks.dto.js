'use strict';

const { fileUrl } = require('../../utils/url.helper');

function formatVehicleCheck(row) {
  if (!row) return null;
  return {
    id: row.id,
    drivername: row.drivername,
    vehiclereg: row.vehiclereg,
    mileage: row.mileage,
    arrival_datetime: row.arrival_datetime,
    planning: {
      routeplanned: row.routeplanned,
      roadconditions: row.roadconditions,
      dressedforweather: row.dressedforweather,
      emergencyequip: row.emergencyequip,
    },
    circleCheck: {
      tires: row.tires,
      lights: row.lights,
      windows: row.windows,
      loads: row.loads,
    },
    underTheHood: {
      washer: row.washer,
      oil: row.oil,
      fluid: row.fluid,
      belts: row.belts,
    },
    behindTheWheel: {
      seatbelt: row.seatbelt,
      horn: row.horn,
      mirrors: row.mirrors,
      brakes: row.brakes,
    },
    trailerAndLoad: {
      trailercoupling: row.trailercoupling,
      safetyconnection: row.safetyconnection,
      loadsecured: row.loadsecured,
      loadweight: row.loadweight,
    },
    vehiclecondition: row.vehiclecondition,
    safe: row.safe,
    report: row.report,
    notes: row.notes,
  };
}

function formatVehicleCheckSummary(row) {
  if (!row) return null;
  return {
    id: row.id,
    drivername: row.drivername,
    vehiclereg: row.vehiclereg,
    mileage: row.mileage,
    arrival_datetime: row.arrival_datetime,
    vehiclecondition: row.vehiclecondition,
    safe: row.safe,
  };
}

function formatDocument(row) {
  if (!row) return null;
  return {
    id: row.id,
    submittedby: row.submittedby,
    arrival_datetime: row.arrival_datetime,
    file_name: row.file_name,
    file_url: row.file_name ? fileUrl(row.file_name) : null,
  };
}

module.exports = { formatVehicleCheck, formatVehicleCheckSummary, formatDocument };
