import clientPromise from '@/lib/mongodb'
import { MongoDBAdapter } from '@auth/mongodb-adapter'
import NextAuth, { getServerSession } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'


let  adminEmails =[]

export async function loadAdminEmailsFromDatabase() {
  const client = await clientPromise;
  const db = client.db();
  const adminEmailCollection = db.collection('adminemails'); // Replace 'adminEmails' with your MongoDB collection name.

  const adminEmailDocuments = await adminEmailCollection.find({}).toArray();
  adminEmails = adminEmailDocuments.map((document) => document.email);

}
loadAdminEmailsFromDatabase();
export const authOptions= {
  secret: process.env.AUTH_SECRET,
  providers: [
    // OAuth authentication providers...
 

    GoogleProvider({
      clientId: process.env.GOOGLE_ID,
      clientSecret: process.env.GOOGLE_SECRET
    }),
    // Passwordless / email sign in

  ],
  adapter:MongoDBAdapter(clientPromise),
  callbacks:{
    session:({session,token,user})=>{
     if(adminEmails.includes(session?.user?.email)){
      return session
     }else{
      return false
     }
//      console.log(session,token,user)
      
    }
  }
}

export default NextAuth(authOptions)

export async function isAdminRequest(req,res){

  try {
    
  
  const session =await  getServerSession(req,res,authOptions)
  
  if(!adminEmails.includes(session?.user?.email)){
    res.status(401).json({error:'Not Admin'})
    console.log('unauthorised user access', sessions?.user?.email)
    return;   
    }
  } catch (error) {
    console.log('Error checking admin status ', error);
    res.status(500).json({error:'Internal server errro'})  
  }
}