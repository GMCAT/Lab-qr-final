import { userSafeSelect } from './users.js';

export function itemInclude() {
  return { brand:true, location:true, status:true, responsible:{ select:userSafeSelect() }, category:true, files:{ orderBy:[{is_cover:'desc'},{sort_order:'asc'},{created_at:'asc'}] }, borrow_logs:{ orderBy:{borrow_date:'desc'}, include:{status_history:{orderBy:{changed_at:'asc'}}} }, maintenance_jobs:{ where:{status:'completed'}, orderBy:{completed_at:'desc'}, take:20, select:{id:true,work_sn:true,job_type:true,status:true,title:true,completed_at:true,result:true,next_due_date:true} } };
}
export function publicItemSelect() {
  return {
    id:true, asset_code:true, name:true, model:true, serial_no:true, size:true, note:true,
    purchase_date:true, price:true, brand:true, location:true, status:true, category:true,
    responsible:{ select:{ id:true, name:true } },
    files:{ orderBy:[{is_cover:'desc'},{sort_order:'asc'},{created_at:'asc'}], select:{id:true,file_name:true,file_url:true,file_type:true,is_cover:true,sort_order:true} },
    maintenance_jobs:{ where:{status:'completed'}, orderBy:{completed_at:'desc'}, take:20, select:{id:true,work_sn:true,job_type:true,status:true,title:true,completed_at:true,result:true,next_due_date:true} }
  };
}
export function findItemByCodeOrId(prisma, codeOrId) {
  return prisma.item.findFirst({ where:{ archived_at:null, OR:[{asset_code:{equals:codeOrId,mode:'insensitive'}},{id:codeOrId}] }, include:itemInclude() });
}
export function findPublicItemByCodeOrId(prisma, codeOrId) {
  return prisma.item.findFirst({ where:{ archived_at:null, OR:[{asset_code:{equals:codeOrId,mode:'insensitive'}},{id:codeOrId}] }, select:publicItemSelect() });
}

export function publicItemCardSelect() {
  return { id:true, asset_code:true, name:true, model:true, updated_at:true, brand:{select:{id:true,name:true}}, location:{select:{id:true,name:true}}, status:{select:{id:true,name:true}}, category:{select:{id:true,name:true}}, files:{where:{file_type:'IMAGE'},orderBy:[{is_cover:'desc'},{sort_order:'asc'}],take:1,select:{file_url:true,file_name:true}} };
}
