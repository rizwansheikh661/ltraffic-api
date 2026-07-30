'use strict';
const repo = require('./notifications.repository');
const firebase = require('../../config/firebase');
const { resolveLevels } = require('../auth/auth.dto');
const { LEVELS } = require('../../constants/roles');
const EVENTS = ['TIMESHEET_SUBMITTED', 'INCIDENT_REPORTED', 'VEHICLE_CHECK_SUBMITTED'];
function audience(rows, pref) { return rows.filter((row) => { const levels=resolveLevels(row.user_level); return (pref.notify_admin && levels.includes(LEVELS.ADMIN)) || (pref.notify_manager && !levels.includes(LEVELS.ADMIN) && [LEVELS.ADMIN1,LEVELS.ADMIN2,LEVELS.ESSEX_SUPERVISOR].some((l)=>levels.includes(l))); }); }
async function listPreferences(){ return repo.preferences(); }
async function updatePreference(eventType, fields, userId){ if(!EVENTS.includes(eventType)) throw require('../../common/apiError').notFound('Notification event not found'); return repo.setPreference(eventType,fields,userId); }
async function notifySubmission({eventType,title,body,data}) { try { const pref=await repo.preference(eventType); const users=audience(await repo.recipients(),pref); await Promise.all(users.map(async (u)=>{ const id=await repo.createInbox(u.user_id,eventType,title,body,data); const tokens=await repo.tokens(u.user_id); if(!tokens.length){await repo.log(id,u.user_id,'skipped','No active device token');return;} try { const result=await firebase.sendToTokens(tokens.map((t)=>t.token),{notification:{title,body},data:Object.fromEntries(Object.entries(data).map(([k,v])=>[k,String(v)]))}); await repo.log(id,u.user_id,result.disabled?'skipped':result.failureCount?'failed':'sent',result.disabled?'FCM disabled':null); } catch(error){await repo.log(id,u.user_id,'failed',error.message);}})); } catch(error){ require('../../config/logger').warn('[notifications] submission alert failed',{eventType,error:error.message}); } }
module.exports={ EVENTS, listPreferences, updatePreference, notifySubmission };