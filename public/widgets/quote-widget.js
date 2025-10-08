/**
 * BigCommerce Get a Quote Widget
 * This script handles the quote request functionality on the storefront
 */

(function() {
  'use strict';
  
  // Configuration - will be set by BigCommerce widget
  const config = {
    apiUrl: window.QUOTE_WIDGET_API_URL || 'https://your-app-url.vercel.app',
    storeHash: window.QUOTE_WIDGET_STORE_HASH || ''
  };
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  function init() {
    console.log('Quote Widget initialized');
    
    // Find all "Get a Quote" buttons
    const quoteButtons = document.querySelectorAll('[data-quote-button]');
    
    quoteButtons.forEach(button => {
      button.addEventListener('click', handleQuoteButtonClick);
    });
    
    // Also listen for dynamically added buttons
    document.addEventListener('click', function(e) {
      if (e.target.matches('[data-quote-button]') || e.target.closest('[data-quote-button]')) {
        const button = e.target.matches('[data-quote-button]') ? e.target : e.target.closest('[data-quote-button]');
        handleQuoteButtonClick.call(button, e);
      }
    });
  }
  
  function handleQuoteButtonClick(e) {
    e.preventDefault();
    
    // Get product data from button attributes
    const button = e.currentTarget || this;
    const productData = {
      id: parseInt(button.dataset.productId) || 0,
      name: button.dataset.productName || '',
      sku: button.dataset.productSku || '',
      price: parseFloat(button.dataset.productPrice) || 0,
      imageUrl: button.dataset.productImage || ''
    };
    
    if (!productData.id || !productData.name) {
      console.error('Missing product data');
      alert('Unable to load product information');
      return;
    }
    
    openQuoteModal(productData);
  }
  
  function openQuoteModal(product) {
    // Create modal HTML
    const modal = document.createElement('div');
    modal.className = 'quote-modal';
    modal.innerHTML = `
      <div class="quote-modal-overlay"></div>
      <div class="quote-modal-content">
        <button class="quote-modal-close" aria-label="Close">&times;</button>
        
        <h2 class="quote-modal-title">Request a Quote</h2>
        
        <div class="quote-product-info">
          ${product.imageUrl ? `<img src="${product.imageUrl}" alt="${product.name}" class="quote-product-image">` : ''}
          <div>
            <h3>${product.name}</h3>
            <p class="quote-product-sku">SKU: ${product.sku}</p>
            <p class="quote-product-price">$${product.price.toFixed(2)}</p>
          </div>
        </div>
        
        <form class="quote-form" id="quoteForm">
          <div class="quote-form-group">
            <label for="quoteName">Name *</label>
            <input type="text" id="quoteName" name="name" required>
          </div>
          
          <div class="quote-form-group">
            <label for="quoteEmail">Email *</label>
            <input type="email" id="quoteEmail" name="email" required>
          </div>
          
          <div class="quote-form-group">
            <label for="quotePhone">Phone *</label>
            <input type="tel" id="quotePhone" name="phone" required>
          </div>
          
          <div class="quote-form-group">
            <label for="quoteCompany">Company (Optional)</label>
            <input type="text" id="quoteCompany" name="company">
          </div>
          
          <div class="quote-form-group">
            <label for="quoteQuantity">Quantity *</label>
            <input type="number" id="quoteQuantity" name="quantity" min="1" value="1" required>
          </div>
          
          <div class="quote-form-group">
            <label for="quoteNotes">Additional Notes (Optional)</label>
            <textarea id="quoteNotes" name="notes" rows="3"></textarea>
          </div>
          
          <div class="quote-form-actions">
            <button type="button" class="quote-btn-cancel">Cancel</button>
            <button type="submit" class="quote-btn-submit">Submit Quote Request</button>
          </div>
          
          <div class="quote-form-message" style="display: none;"></div>
        </form>
      </div>
    `;
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    
    // Add event listeners
    const closeBtn = modal.querySelector('.quote-modal-close');
    const cancelBtn = modal.querySelector('.quote-btn-cancel');
    const overlay = modal.querySelector('.quote-modal-overlay');
    const form = modal.querySelector('#quoteForm');
    
    closeBtn.addEventListener('click', () => closeModal(modal));
    cancelBtn.addEventListener('click', () => closeModal(modal));
    overlay.addEventListener('click', () => closeModal(modal));
    
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      submitQuote(form, product, modal);
    });
    
    // Focus first input
    setTimeout(() => {
      modal.querySelector('input[name="name"]').focus();
    }, 100);
  }
  
  function closeModal(modal) {
    document.body.style.overflow = '';
    modal.remove();
  }
  
  async function submitQuote(form, product, modal) {
    const submitBtn = form.querySelector('.quote-btn-submit');
    const messageEl = form.querySelector('.quote-form-message');
    
    // Get form data
    const formData = new FormData(form);
    const quoteData = {
      storeHash: config.storeHash,
      customer: {
        name: formData.get('name'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        company: formData.get('company') || undefined
      },
      product: product,
      quantity: parseInt(formData.get('quantity')),
      notes: formData.get('notes') || undefined
    };
    
    // Disable submit button
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
    messageEl.style.display = 'none';
    
    try {
      const response = await fetch(`${config.apiUrl}/api/bc/quotes/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(quoteData)
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Show success message
        messageEl.className = 'quote-form-message quote-success';
        messageEl.textContent = 'Thank you! Your quote request has been submitted. We will contact you soon.';
        messageEl.style.display = 'block';
        
        // Clear form
        form.reset();
        
        // Close modal after 3 seconds
        setTimeout(() => {
          closeModal(modal);
        }, 3000);
      } else {
        throw new Error(result.error || 'Failed to submit quote');
      }
    } catch (error) {
      console.error('Quote submission error:', error);
      messageEl.className = 'quote-form-message quote-error';
      messageEl.textContent = 'Sorry, there was an error submitting your quote. Please try again or contact us directly.';
      messageEl.style.display = 'block';
      
      // Re-enable submit button
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Quote Request';
    }
  }
})();