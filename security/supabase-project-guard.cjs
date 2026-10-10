'use strict';
const BLOCKED_SUPABASE_PROJECTS=Object.freeze(['uobxxgzshrmbtjfdolxd']);
function assertDedicatedSupabaseProject(projectRef){
 if(typeof projectRef!=='string'||!/^[a-z0-9]{20}$/.test(projectRef))throw new Error('Dedicated Roleta Supabase project ref required');
 if(BLOCKED_SUPABASE_PROJECTS.includes(projectRef))throw new Error('SECURITY_BLOCK: Discador-MesaCliente must never be used by Roleta');
 return projectRef;
}
module.exports={BLOCKED_SUPABASE_PROJECTS,assertDedicatedSupabaseProject};
