'use strict';
const asyncHandler=require('../../common/asyncHandler'); const { ok }=require('../../common/response'); const service=require('./notifications.service');
const list=asyncHandler(async(_req,res)=>ok(res,await service.listPreferences()));
const update=asyncHandler(async(req,res)=>ok(res,await service.updatePreference(req.params.eventType,req.body,req.user.id)));
module.exports={list,update};