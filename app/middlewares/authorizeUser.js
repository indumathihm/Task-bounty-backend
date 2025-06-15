const authorizeUser=(permittedRoles)=>{
    return (req,res,next)=> {      
        if(permittedRoles.includes(req.role)){
            next();
        } else{
            res.status(403).send({message:"Unauthorized access"});
        }
    }
}

export default authorizeUser;