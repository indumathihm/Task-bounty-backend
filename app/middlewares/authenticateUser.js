import jwt from "jsonwebtoken"
export default function authenticateUser(req,res,next){
    let token=req.headers['authorization']
    if(!token){
        return res.status(401).json({errors:"token is required"})
    }
    try{
        token=token.split(" ")[1];
        const tokenData=jwt.verify(token,process.env.JWT_SECRET)
        req.userId=tokenData.userId;
        req.role=tokenData.role;
        next();
    } catch(err){
        res.status(401).json({errors:err.message})
    }
}