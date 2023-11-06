// import { AdminEmail } from "@/models/Admin";
// let adminEmails = [];
// export async function fetchAdminEmail(){
//     try {
//         const adminEmailsData = await  AdminEmail.find({}, 'email')
        
//         adminEmails= adminEmailsData.map((admin)=>admin.email);
//         return adminEmails
//     } catch (error) {
//         console.error('Error Fetching Admin Email', error)
//         return []
        
//     }
// }