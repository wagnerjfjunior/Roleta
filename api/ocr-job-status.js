'use strict';
// Owner-scoped retrieval endpoint is pending review.
module.exports=async function handler(req,res){return res.status(503).json({error:'OCR recovery not enabled'});};
