from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING, DESCENDING
import os
from dotenv import load_dotenv
from datetime import datetime
from typing import Optional, List, Dict, Any
import logging

load_dotenv()
logger = logging.getLogger(__name__)


class MongoDB:
    def __init__(self):
        self.client = None
        self.db = None

    @property
    def is_connected(self) -> bool:
        return self.db is not None

    async def connect_to_database(self):
        mongodb_url = os.getenv("MONGODB_URL")
        db_name = os.getenv("MONGODB_DB_NAME", "student_dropout_db")

        self.client = AsyncIOMotorClient(mongodb_url, serverSelectionTimeoutMS=30000)
        tmp_db = self.client[db_name]
        # Verify connectivity before assigning — keeps self.db = None on failure
        await tmp_db.command("ping")
        self.db = tmp_db
        await self.create_indexes()
        logger.info("Connected to MongoDB")

    async def close_database_connection(self):
        if self.client:
            self.client.close()
            logger.info("MongoDB connection closed")

    async def create_indexes(self):
        # ============================================
        # GANGADHARA'S COLLECTION: students
        # ============================================
        await self.db.students.create_index("student_id", unique=True)
        await self.db.students.create_index([("created_at", DESCENDING)])

        # ============================================
        # WANSANAYAKA'S COLLECTION: predictions
        # ============================================
        await self.db.predictions.create_index(
            [("student_id", ASCENDING), ("timestamp", DESCENDING)]
        )
        await self.db.predictions.create_index("risk_level")

        # ============================================
        # RAJAKARUNA'S COLLECTION: users
        # ============================================
        await self.db.users.create_index("user_id", unique=True)
        await self.db.users.create_index("username", unique=True)
        await self.db.users.create_index("email", unique=True)

        # ============================================
        # PIYARATHNE'S COLLECTION: chat_logs
        # ============================================
        await self.db.chat_logs.create_index(
            [("student_id", ASCENDING), ("timestamp", DESCENDING)]
        )
        await self.db.chat_logs.create_index("predicted_intent")

        # ============================================
        # WARNAKULAARACHCHI'S COLLECTION: risk_explanations
        # ============================================
        await self.db.risk_explanations.create_index("prediction_id", unique=True)
        await self.db.risk_explanations.create_index([("student_id", ASCENDING)])
        await self.db.risk_explanations.create_index([("generated_at", DESCENDING)])

        # ============================================
        # THENNAKOON'S COLLECTION: analytics_reports
        # ============================================
        await self.db.analytics_reports.create_index([("generated_at", DESCENDING)])
        await self.db.analytics_reports.create_index("generated_by")

    # ============================================
    # GANGADHARA'S OPERATIONS - students collection
    # ============================================

    async def create_student(self, student_data: dict) -> str:
        result = await self.db.students.insert_one(student_data)
        return str(result.inserted_id)

    async def get_student(self, student_id: str) -> Optional[dict]:
        return await self.db.students.find_one({"student_id": student_id})

    async def update_student(self, student_id: str, update_data: dict) -> bool:
        update_data["updated_at"] = datetime.utcnow()
        result = await self.db.students.update_one(
            {"student_id": student_id},
            {"$set": update_data}
        )
        return result.modified_count > 0

    async def list_students(self, skip: int = 0, limit: int = 100) -> List[dict]:
        cursor = self.db.students.find().sort("created_at", DESCENDING).skip(skip).limit(limit)
        return await cursor.to_list(length=limit)

    # ============================================
    # WANSANAYAKA'S OPERATIONS - predictions collection
    # ============================================

    async def save_prediction(self, prediction_data: dict) -> str:
        result = await self.db.predictions.insert_one(prediction_data)
        return str(result.inserted_id)

    async def update_prediction_explanation_id(self, prediction_id_str: str, explanation_id: str):
        from bson import ObjectId
        try:
            await self.db.predictions.update_one(
                {"_id": ObjectId(prediction_id_str)},
                {"$set": {"explanation_id": explanation_id}},
            )
        except Exception:
            pass

    async def get_student_predictions(self, student_id: str, limit: int = 10) -> List[dict]:
        cursor = self.db.predictions.find(
            {"student_id": student_id}
        ).sort("timestamp", DESCENDING).limit(limit)
        return await cursor.to_list(length=limit)

    async def get_prediction_stats(self) -> dict:
        pipeline = [{"$group": {"_id": "$risk_level", "count": {"$sum": 1}}}]
        cursor = self.db.predictions.aggregate(pipeline)
        stats = await cursor.to_list(length=10)
        result = {"total": 0}
        for stat in stats:
            result[stat["_id"]] = stat["count"]
            result["total"] += stat["count"]
        return result

    # ============================================
    # RAJAKARUNA'S OPERATIONS - users collection
    # ============================================

    async def create_user(self, user_data: dict) -> str:
        result = await self.db.users.insert_one(user_data)
        return str(result.inserted_id)

    async def get_user(self, username: str) -> Optional[dict]:
        return await self.db.users.find_one({"username": username})

    async def get_user_by_email(self, email: str) -> Optional[dict]:
        return await self.db.users.find_one({"email": email})

    async def update_user_login(self, username: str):
        await self.db.users.update_one(
            {"username": username},
            {"$set": {"last_login": datetime.utcnow()}}
        )

    # ============================================
    # PIYARATHNE'S OPERATIONS - chat_logs collection
    # ============================================

    async def save_chat_log(self, log: dict) -> str:
        result = await self.db.chat_logs.insert_one(log)
        return str(result.inserted_id)

    async def get_student_chat_logs(self, student_id: str, limit: int = 20) -> List[dict]:
        cursor = self.db.chat_logs.find(
            {"student_id": student_id}
        ).sort("timestamp", DESCENDING).limit(limit)
        return await cursor.to_list(length=limit)

    async def get_chat_stats(self) -> dict:
        pipeline = [{"$group": {"_id": "$predicted_intent", "count": {"$sum": 1}}}]
        cursor = self.db.chat_logs.aggregate(pipeline)
        stats = await cursor.to_list(length=10)
        return {stat["_id"]: stat["count"] for stat in stats}

    # ============================================
    # WARNAKULAARACHCHI'S OPERATIONS - risk_explanations collection
    # ============================================

    async def save_explanation(self, explanation_data: dict) -> str:
        result = await self.db.risk_explanations.insert_one(explanation_data)
        return str(result.inserted_id)

    async def get_prediction_explanation(self, prediction_id: str) -> Optional[dict]:
        return await self.db.risk_explanations.find_one({"prediction_id": prediction_id})

    # ============================================
    # THENNAKOON'S OPERATIONS - analytics (reads from all)
    # ============================================

    async def get_analytics_dashboard(self) -> dict:
        total_students = await self.db.students.count_documents({})
        risk_stats = await self.get_prediction_stats()
        intent_stats = await self.get_chat_stats()

        # Fetch recent predictions without filtering by student_id
        recent_cursor = self.db.predictions.find().sort("timestamp", DESCENDING).limit(5)
        recent_predictions = await recent_cursor.to_list(length=5)

        return {
            "total_students": total_students,
            "risk_distribution": risk_stats,
            "intent_distribution": intent_stats,
            "recent_predictions": recent_predictions,
            "last_updated": datetime.utcnow(),
        }

    async def save_analytics_report(self, report: dict) -> str:
        result = await self.db.analytics_reports.insert_one(report)
        return str(result.inserted_id)

    async def get_latest_analytics_report(self) -> Optional[dict]:
        return await self.db.analytics_reports.find_one(
            {}, sort=[("generated_at", DESCENDING)]
        )

    async def get_analytics_history(self, limit: int = 20) -> List[dict]:
        cursor = self.db.analytics_reports.find().sort("generated_at", DESCENDING).limit(limit)
        return await cursor.to_list(length=limit)

    async def get_risk_trends(self, days: int = 30) -> list:
        from datetime import timedelta
        cutoff = datetime.utcnow() - timedelta(days=days)
        pipeline = [
            {"$match": {"timestamp": {"$gte": cutoff}}},
            {
                "$group": {
                    "_id": {
                        "date": {
                            "$dateToString": {
                                "format": "%Y-%m-%d",
                                "date": "$timestamp",
                            }
                        },
                        "risk_level": "$risk_level",
                    },
                    "count": {"$sum": 1},
                }
            },
            {"$sort": {"_id.date": 1}},
        ]
        cursor = self.db.predictions.aggregate(pipeline)
        raw = await cursor.to_list(length=1000)
        # Reshape into [{date, risk_level, count}]
        return [
            {
                "date": item["_id"]["date"],
                "risk_level": item["_id"]["risk_level"],
                "count": item["count"],
            }
            for item in raw
        ]

    async def get_top_factors(self, limit: int = 10) -> list:
        """Aggregate most common feature names from SHAP risk_explanations."""
        # Combine positive and negative factors using $facet then $unionWith-style via two unwinds
        pipeline = [
            {
                "$project": {
                    "all_factors": {
                        "$concatArrays": [
                            {"$ifNull": ["$top_positive_factors", []]},
                            {"$ifNull": ["$top_negative_factors", []]},
                        ]
                    }
                }
            },
            {"$unwind": "$all_factors"},
            {
                "$group": {
                    "_id": "$all_factors.feature",
                    "count": {"$sum": 1},
                    "avg_impact": {"$avg": {"$abs": "$all_factors.impact"}},
                }
            },
            {"$sort": {"count": DESCENDING}},
            {"$limit": limit},
        ]
        cursor = self.db.risk_explanations.aggregate(pipeline)
        raw = await cursor.to_list(length=limit)
        return [
            {"feature": item["_id"], "count": item["count"], "avg_impact": item["avg_impact"]}
            for item in raw
        ]


mongodb = MongoDB()
