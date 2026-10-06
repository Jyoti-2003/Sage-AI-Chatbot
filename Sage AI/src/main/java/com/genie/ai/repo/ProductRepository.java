package com.genie.ai.repo;

import com.genie.ai.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;


// Tells Spring that this is a repository
@Repository

// JpaRepository provides ready-made database operations
public interface ProductRepository extends JpaRepository<Product, Long> {

    // Finds products where:
    // 1. Category matches the given category
    // 2. Price is less than the given price
    //
    // Example:
    // category = "Television"
    // price = 30000
    //
    // It will find all TVs below ₹30,000
    List<Product> findByCategoryAndPriceLessThan(
            String category,
            double price
    );
}