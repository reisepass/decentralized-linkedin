import { NextFunction, Request, Response } from "express";
import { logger } from "../index.js";
import Joi from "joi";
import { supabase } from "../config.js";
import {
  dateDiffInDays,
  getWeb3BioNextId,
  crawlEAS,
  airStackFarCaster,
  queryWallets,
} from "./util.js";
import { filterUserAssets } from "./user-balance.js";
import { getAllAttestations } from "lib/dist/getAllAttestations.js";

import { calcTrustScore,internalcalcTrustScore } from "./calcTrustScore.js";


 

// Collects metadata about the uploaded media and adds it to the manual review inbox
export const calcAllTrustScores = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Attestation is verified in middleware before this function is called
  logger.debug("calc all scores:", req.body);
  


  const { data } = await supabase
      .from("people_search")
      .select("*")
      .lt("trust_score", 0.01)   



if(data){

    console.log( " in calcAllTrustScores() people_search data "+ JSON.stringify(data.slice(0, 50)))

      for (let s = 0; s < data.length; s+=1) {
        const row =data[s]
      //@ts-ignore
      //@ts-ignore
        let resi = await internalcalcTrustScore(row.pk)
        console.log("    internalcalcTrustScore() resi :   "+ JSON.stringify(resi) )

  1==1
 
      }
    }
    return res.status(200).send({ status:200 });
}
